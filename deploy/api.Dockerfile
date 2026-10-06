FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src
COPY src/TravelWise.Api/TravelWise.Api.csproj src/TravelWise.Api/
RUN dotnet restore src/TravelWise.Api/TravelWise.Api.csproj
COPY . .
RUN dotnet publish src/TravelWise.Api/TravelWise.Api.csproj -c Release -o /app/publish --no-restore
FROM mcr.microsoft.com/dotnet/aspnet:8.0
WORKDIR /app
COPY --from=build /app/publish .
EXPOSE 10000
ENTRYPOINT ["dotnet", "TravelWise.Api.dll"]
