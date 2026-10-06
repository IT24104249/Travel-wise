from __future__ import annotations

from datetime import datetime, timezone
from enum import StrEnum
import os
from typing import Any, Callable
from uuid import UUID

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field
from dotenv import load_dotenv
from .gemini import generate_plan

load_dotenv()
app = FastAPI(title="TravelWise Agentic AI", version="1.0.0")


class WorkflowState(StrEnum):
    CREATED = "CREATED"
    PLANNING = "PLANNING"
    DELEGATING = "DELEGATING"
    AGENTS_RUNNING = "AGENTS_RUNNING"
    VALIDATING = "VALIDATING"
    AWAITING_APPROVAL = "AWAITING_APPROVAL"
    COMPLETED = "COMPLETED"
    VALIDATION_FAILED = "VALIDATION_FAILED"
    AGENT_FAILED = "AGENT_FAILED"


class WorkflowRequest(BaseModel):
    workflow_id: UUID
    objective: str = Field(min_length=10, max_length=1000)
    destination: str = Field(default="", max_length=200)
    catalog_items: list[dict[str, Any]] = Field(default_factory=list, max_length=50)


class AgentResult(BaseModel):
    agent: str
    responsibility: str
    output: dict[str, Any]
    tools_used: list[str]


class WorkflowResponse(BaseModel):
    workflow_id: UUID
    objective: str
    state: WorkflowState
    plan: list[str]
    agents: list[AgentResult]
    validation: dict[str, Any]
    approval_required: bool
    updated_at: datetime
    model: str = "deterministic-tools"
    gemini_plan: dict[str, Any] | None = None


_workflows: dict[UUID, WorkflowResponse] = {}


def get_expenses(_: dict[str, Any]) -> dict[str, Any]:
    return {"total": 0, "currency": "LKR", "items": []}


def check_conflict(_: dict[str, Any]) -> dict[str, Any]:
    return {"has_conflict": False, "conflicts": []}


def get_weather(_: dict[str, Any]) -> dict[str, Any]:
    return {"provider": "safe-demo-fallback", "severity": "LOW", "advisory": "No live weather configured."}


def calculate_balances(_: dict[str, Any]) -> dict[str, Any]:
    return {"balances": [], "net_balance_sum": 0}


def convert_currency(_: dict[str, Any]) -> dict[str, Any]:
    return {"rate": 1, "source": "same-currency fallback"}


def generate_settlement_plan(_: dict[str, Any]) -> dict[str, Any]:
    return {"transfers": [], "transaction_count": 0}


def search_catalog(context: dict[str, Any]) -> dict[str, Any]:
    items = context.get("catalog_items", [])
    visiting_places = [i for i in items if i.get("type") == "VisitingPlace"]
    restaurants = [i for i in items if i.get("type") == "Restaurant"]
    accommodations = [i for i in items if i.get("type") == "Accommodation"]
    food_prices = [i for i in items if i.get("type") == "FoodPrice"]
    return {
        "items": items,
        "count": len(items),
        "categories": {
            "visiting_places": visiting_places,
            "restaurants": restaurants,
            "accommodations": accommodations,
            "food_prices": food_prices,
        },
        "recommendations_summary": f"Found {len(visiting_places)} visiting places, {len(restaurants)} restaurants, {len(accommodations)} stay options, and {len(food_prices)} food price quotes for {context.get('destination', 'the destination')}.",
        "source": "approved-provider-catalog"
    }


TOOLS: dict[str, Callable[[dict[str, Any]], dict[str, Any]]] = {
    "GetExpenses": get_expenses,
    "CheckConflict": check_conflict,
    "GetWeather": get_weather,
    "CalculateBalances": calculate_balances,
    "ConvertCurrency": convert_currency,
    "GenerateSettlementPlan": generate_settlement_plan,
    "SearchCatalog": search_catalog,
}


def run_agent(name: str, responsibility: str, tool_names: list[str], context: dict[str, Any]) -> AgentResult:
    outputs = {tool: TOOLS[tool](context) for tool in tool_names}
    return AgentResult(agent=name, responsibility=responsibility, output=outputs, tools_used=tool_names)


def orchestrate(request: WorkflowRequest) -> WorkflowResponse:
    plan = [
        "Collect trip context and identify budget, activity, safety and group-billing checks.",
        "Delegate each check to its least-privilege specialist agent.",
        "Validate structured outputs against deterministic business rules.",
        "Pause any high-impact recommendation for authorized human approval.",
    ]
    context = {
        "workflow_id": str(request.workflow_id),
        "objective": request.objective,
        "destination": request.destination,
        "catalog_items": request.catalog_items,
    }
    agents = [
        run_agent("Budget Agent", "Budget health and overspending analysis.", ["GetExpenses"], context),
        run_agent("Activity Agent", "Activity schedule conflict analysis and approved place recommendations.", ["CheckConflict", "SearchCatalog"], context),
        run_agent("Risk Agent", "Destination safety and weather advisory.", ["GetWeather"], context),
        run_agent("Split-Bill Agent", "Shared expense balance and settlement analysis.", ["CalculateBalances", "ConvertCurrency", "GenerateSettlementPlan"], context),
    ]
    model_plan = generate_plan(
        request.objective,
        [agent.agent for agent in agents],
        request.destination,
        request.catalog_items,
    )
    validation = {
        "schema_valid": all(agent.output is not None for agent in agents),
        "model_output_valid": model_plan is None or isinstance(model_plan, dict),
        "business_rules": ["BR-BUD-01", "BR-ACT-01", "BR-RISK-01", "BR-SPLIT-01", "BR-SPLIT-02"],
        "safe_failure": True,
    }
    state = WorkflowState.AWAITING_APPROVAL if validation["schema_valid"] and validation["model_output_valid"] else WorkflowState.VALIDATION_FAILED
    return WorkflowResponse(
        workflow_id=request.workflow_id,
        objective=request.objective,
        state=state,
        plan=plan,
        agents=agents,
        validation=validation,
        approval_required=state == WorkflowState.AWAITING_APPROVAL,
        updated_at=datetime.now(timezone.utc),
        model=os.getenv("GEMINI_MODEL", "deterministic-tools") if model_plan else "deterministic-tools",
        gemini_plan=model_plan,
    )


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok", "service": "travelwise-agentic-ai"}


@app.post("/internal/workflows", response_model=WorkflowResponse)
def start_workflow(request: WorkflowRequest) -> WorkflowResponse:
    try:
        result = orchestrate(request)
    except Exception as error:
        raise HTTPException(status_code=502, detail=f"AI workflow failed safely: {error}") from error
    _workflows[request.workflow_id] = result
    return result


@app.get("/internal/workflows/{workflow_id}", response_model=WorkflowResponse)
def get_workflow(workflow_id: UUID) -> WorkflowResponse:
    if workflow_id not in _workflows:
        raise HTTPException(status_code=404, detail="Workflow not found")
    return _workflows[workflow_id]
