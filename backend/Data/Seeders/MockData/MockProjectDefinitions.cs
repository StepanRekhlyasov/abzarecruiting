namespace Backend.Api.Data.Seeders.MockData;

internal static class MockProjectDefinitions
{
    internal sealed record Definition(
        string Name,
        string Description,
        int StartYear,
        int StartMonth,
        int? EndYear,
        int? EndMonth,
        string[] TagNames);

    /// <summary>
    /// Per-candidate project templates. Counts: 7, 8, 6, 9, 5 (within 5–10).
    /// </summary>
    public static IReadOnlyDictionary<string, Definition[]> ByCandidateEmail { get; } =
        new Dictionary<string, Definition[]>(StringComparer.OrdinalIgnoreCase)
        {
            ["user-1@fexpost.com"] =
            [
                new("Personal finance dashboard", "React dashboard for budgeting with chart widgets and CSV import.", 2023, 1, 2023, 8, ["React", "TypeScript", "CSS3"]),
                new("Family task board", "Lightweight kanban board with drag-and-drop and local persistence.", 2023, 9, 2024, 2, ["React", "JavaScript", "Vite"]),
                new("Recipe sharing API", "ASP.NET Core API for recipes with JWT auth and PostgreSQL.", 2024, 3, 2024, 9, ["C#", "ASP.NET Core", "PostgreSQL", "JWT"]),
                new("Accessibility audit toolkit", "Checklist app helping teams track WCAG fixes across pages.", 2024, 10, 2025, 2, ["TypeScript", "React", "HTML5"]),
                new("Portfolio site rebuild", "Personal portfolio rebuilt with Next.js and markdown content.", 2025, 3, 2025, 6, ["Next.js", "React", "Tailwind CSS"]),
                new("Interview prep notes app", "Spaced-repetition notes for system design interviews.", 2025, 7, null, null, ["React", "TypeScript", "System Design"]),
                new("Open-source UI primitives", "Small set of accessible React primitives published as npm package.", 2022, 6, 2022, 12, ["React", "TypeScript", "Jest"]),
            ],
            ["user-2@fexpost.com"] =
            [
                new("Order tracking microservice", "Go service for shipment events with gRPC and Kafka consumers.", 2022, 2, 2022, 11, ["Go", "gRPC", "Kafka", "Docker"]),
                new("Warehouse inventory API", "REST inventory service with optimistic locking and Redis cache.", 2023, 1, 2023, 7, ["Go", "Redis", "REST API", "PostgreSQL"]),
                new("CI pipeline templates", "Reusable GitHub Actions workflows for Go services.", 2023, 8, 2024, 1, ["GitHub Actions", "CI/CD", "Docker"]),
                new("Metrics gateway", "Prometheus exporters and Grafana dashboards for order flows.", 2024, 2, 2024, 8, ["Prometheus", "Grafana", "Linux"]),
                new("Load test harness", "k6-inspired scenarios for peak checkout traffic simulation.", 2024, 9, 2025, 1, ["REST API", "Integration Testing"]),
                new("Feature flag service", "Internal flags service with audit log and SDK stubs.", 2025, 2, 2025, 7, ["Go", "PostgreSQL", "REST API"]),
                new("Incident runbook portal", "Static + API hybrid portal documenting on-call playbooks.", 2025, 8, null, null, ["React", "TypeScript", "Git"]),
                new("Legacy SOAP adapter", "Adapter bridging SOAP partners to internal REST contracts.", 2021, 5, 2021, 12, ["Java", "REST API", "OpenAPI"]),
            ],
            ["user-3@fexpost.com"] =
            [
                new("Clinic appointment UI", "Vue SPA for booking and rescheduling medical appointments.", 2023, 3, 2023, 10, ["Vue.js", "JavaScript", "CSS3"]),
                new("Patient intake forms", "Dynamic form builder with validation and PDF export.", 2023, 11, 2024, 4, ["TypeScript", "React", "HTML5"]),
                new("FHIR mapping toolkit", "Utilities mapping internal models to FHIR-inspired payloads.", 2024, 5, 2024, 11, ["TypeScript", "Node.js", "REST API"]),
                new("Health analytics widgets", "Reusable chart widgets for clinic KPIs.", 2025, 1, 2025, 5, ["React", "TypeScript", "Vite"]),
                new("Telemedicine chat MVP", "WebSocket chat prototype for doctor-patient messaging.", 2025, 6, null, null, ["WebSockets", "Node.js", "React"]),
                new("Design system tokens", "Shared design tokens and Storybook for clinic products.", 2022, 8, 2023, 1, ["CSS3", "Sass", "React"]),
            ],
            ["user-4@fexpost.com"] =
            [
                new("ETL for marketing events", "Python pipelines ingesting clickstream events into a warehouse.", 2022, 1, 2022, 9, ["Python", "ETL Pipelines", "SQL", "PostgreSQL"]),
                new("Customer 360 model", "Dimensional model uniting CRM and product usage data.", 2022, 10, 2023, 4, ["Data Modeling", "SQL", "PostgreSQL"]),
                new("Airflow-style orchestrator PoC", "Lightweight DAG runner for batch jobs with retries.", 2023, 5, 2023, 12, ["Python", "Docker", "Linux"]),
                new("Real-time fraud features", "Kafka stream enriching transactions with risk features.", 2024, 1, 2024, 7, ["Kafka", "Python", "Redis"]),
                new("dbt-like transform layer", "SQL transform conventions and documentation generator.", 2024, 8, 2025, 1, ["SQL", "Data Modeling", "Git"]),
                new("ML feature store spike", "Prototype feature retrieval API for scoring services.", 2025, 2, 2025, 6, ["Python", "FastAPI", "Redis", "Machine Learning Basics"]),
                new("Data quality monitors", "Anomaly checks on nightly warehouse loads.", 2025, 7, null, null, ["Python", "PostgreSQL", "Grafana"]),
                new("GDPR deletion workflow", "Automation for subject erasure across analytical stores.", 2021, 6, 2021, 12, ["GDPR Awareness", "Python", "SQL"]),
                new("BI semantic layer docs", "Documented metrics catalog for self-serve analytics.", 2023, 2, 2023, 5, ["Data Modeling", "SQL"]),
            ],
            ["user-5@fexpost.com"] =
            [
                new("Banking onboarding API", "ASP.NET Core onboarding flows with KYC webhooks.", 2023, 4, 2023, 12, ["C#", "ASP.NET Core", "Entity Framework", "SQL"]),
                new("Payments reconciliation job", "Nightly reconciliation between PSP reports and ledger.", 2024, 1, 2024, 6, ["C#", ".NET", "PostgreSQL", "Unit Testing"]),
                new("PCI-aware logging guidelines", "Internal guide and sample middleware for safe logging.", 2024, 7, 2024, 10, ["PCI DSS Awareness", "ASP.NET Core", "OWASP"]),
                new("Customer support portal", "Hybrid React portal for case management and SLAs.", 2025, 1, 2025, 8, ["React", "TypeScript", "REST API"]),
                new("Ledger read model", "CQRS read side for account balances and statements.", 2025, 9, null, null, ["C#", "CQRS", "Event-Driven Architecture", "SQL"]),
            ],
        };
}
