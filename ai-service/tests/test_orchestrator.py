from uuid import uuid4

from app.main import WorkflowRequest, WorkflowState, orchestrate


def test_minimum_workflow_has_four_distinct_agents_and_requires_approval() -> None:
    result = orchestrate(WorkflowRequest(workflow_id=uuid4(), objective="Prepare a safe group trip plan"))
    assert result.state == WorkflowState.AWAITING_APPROVAL
    assert result.approval_required is True
    assert len(result.agents) == 4
    assert len({agent.agent for agent in result.agents}) == 4
    assert result.validation["schema_valid"] is True


def test_short_objective_is_rejected() -> None:
    try:
        WorkflowRequest(workflow_id=uuid4(), objective="short")
    except ValueError:
        return
    raise AssertionError("Expected Pydantic validation error")
