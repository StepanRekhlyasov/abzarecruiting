namespace Backend.Api.Data.Seeders.MockData;

internal static class MockMessageDefinitions
{
    internal sealed record Definition(
        int Index,
        string PositionName,
        string AuthorEmail,
        string Content);

    private static readonly string[] AuthorEmails =
    [
        "user-1@fexpost.com",
        "user-2@fexpost.com",
        "user-3@fexpost.com",
        "user-4@fexpost.com",
        "user-5@fexpost.com",
        "user-6@fexpost.com",
        "user-7@fexpost.com",
        "user-8@fexpost.com",
        "user-9@fexpost.com",
        "user-10@fexpost.com",
    ];

    /// <summary>Exactly 100 unique markdown bodies (marker added in Build).</summary>
    private static readonly string[] Bodies =
    [
        "## Quick question\nCould you clarify the expected **onboarding timeline** for this role?\n\n- Start date flexibility?\n- Probation length?",
        "Looks like a strong match for someone with solid `TypeScript` and API design experience.\n\n> Please share a short architecture note if available.",
        "### Feedback\nThe stack fits well. Curious about:\n\n1. Code review process\n2. Release cadence\n3. On-call expectations",
        "Hi team — interested in the **hybrid** setup.\n\n```text\nPreferred: 2 days office / 3 remote\n```",
        "Sharing a few relevant highlights:\n\n- Delivered microservices migration\n- Improved CI pipeline runtime by ~30%\n- Mentored juniors on testing practices",
        "## Clarification needed\nIs **English C1** a hard requirement, or is B2 acceptable for strong technical profiles?",
        "Thanks for posting. Could you list the *must-have* vs *nice-to-have* skills?\n\n| Skill | Priority |\n| --- | --- |\n| SQL | must |\n| Kafka | nice |",
        "Candidate note: experience with **PostgreSQL**, Redis, and incident response.\n\nHappy to provide a sample runbook.",
        "### Schedule\nAvailable for a technical interview next week:\n\n- Tue 10:00–12:00 UTC\n- Thu 14:00–17:00 UTC",
        "Recruiter update: we are prioritizing profiles with recent **cloud** certifications and production Kubernetes experience.",
        "## Domain fit\nDo you expect prior **FinTech** exposure, or is strong general backend experience enough?",
        "I have shipped React + NestJS features end-to-end. Open to a take-home if that helps.",
        "### Security focus\nAny mandatory training on OWASP / secure SDLC before joining production support?",
        "Quick note from recruiting: please attach a **portfolio** link when applying.",
        "Would remote-first candidates still be considered for this **office-leaning** posting?",
        "```bash\ngit log --since=\"1 year\" --author=\"me\"\n```\nHappy to walk through recent commits in interview.",
        "## Team structure\nHow large is the squad, and is there a dedicated Tech Lead?",
        "I noticed `gRPC` in the stack. Is REST still the public API surface?",
        "Candidate: 4 years with **ASP.NET Core** and EF Core, including multi-tenant apps.",
        "Recruiter ping: screening calls this week are *fully booked* — next slots open Monday.",
        "### Observability\nDo you use Prometheus/Grafana, Datadog, or something else for production metrics?",
        "Is pair programming part of the interview loop, or mainly system design + coding?",
        "I can relocate within **EU** with 6 weeks notice. Passport and work auth ready.",
        "> Small suggestion: clarify seniority expectations for architecture ownership.",
        "## Data side\nFor ETL roles — batch-only, streaming, or both?",
        "Experience with **Kafka** consumers, exactly-once semantics, and schema registry.",
        "Recruiter update: salary band shared privately after first screening.",
        "### Docs culture\nAre ADRs required for significant design changes?",
        "Happy to present a short case study on reducing p95 latency in an API gateway.",
        "Does the role include mentoring interns / juniors as a formal responsibility?",
        "## Mobile angle\nIs React Native preferred over Flutter for the client apps?",
        "I maintain a public npm package with accessible UI primitives — link on request.",
        "Recruiter: please confirm notice period in the first message to hiring managers.",
        "### Testing\nCoverage expectations? Unit + integration + e2e, or risk-based?",
        "Comfortable with **Playwright** and contract tests against OpenAPI specs.",
        "Any visa sponsorship for non-EU candidates on this opening?",
        "## Platform work\nIs Terraform the source of truth for infra, or mixed with ClickOps leftovers?",
        "I led a blue/green rollout on Kubernetes with zero customer downtime.",
        "Recruiter note: we need at least one **German B1** speaker on this squad.",
        "### Collaboration\nAsync-first or mostly live meetings across time zones?",
        "Available for a coffee chat to discuss product roadmap fit.",
        "Question: how do you handle tech debt — dedicated capacity each sprint?",
        "## Frontend quality\nDesign system ownership — product design, eng, or shared?",
        "Strong CSS/Tailwind background; also comfortable with Storybook workflows.",
        "Recruiter update: two candidates already in final round for a similar role.",
        "### Performance\nDo you run regular load tests before major releases?",
        "I can share a sanitized k6 scenario we used for checkout peaks.",
        "Is **on-call** weekly, follow-the-sun, or rare escalations only?",
        "## Learning budget\nConference / certification support available?",
        "Planning to renew AWS SAA this quarter — happy if that aligns with goals.",
        "Recruiter: please use the shared scorecard when leaving interview feedback.",
        "### API design\nVersioning strategy — URL, headers, or evolve-in-place?",
        "Built public OpenAPI docs with examples and postman collections.",
        "Would a short unpaid trial task be acceptable for junior applicants?",
        "## Compliance\nAny GDPR/PCI constraints that affect logging and analytics?",
        "I worked under PCI DSS logging rules — can discuss redaction patterns.",
        "Recruiter ping: hiring manager prefers candidates with **banking** domain notes.",
        "### Tooling\nPreferred IDE is fine, but is there a required formatter/linter gate in CI?",
        "We used `dotnet format` + ESLint; open to matching your standards.",
        "Is the product B2B SaaS, marketplace, or internal platform?",
        "## Soft skills\nLooking for facilitation experience for retros / planning?",
        "I have run workshops on incident postmortems with blameless culture.",
        "Recruiter update: referral bonus applies for successful hires this month.",
        "### Databases\nPostgres primary? Any MySQL or Mongo still in production?",
        "Comfortable with query plans, indexes, and read-replica lag troubleshooting.",
        "Can the role start fully remote for the first month?",
        "## Growth path\nTypical path from Mid → Senior in this org?",
        "I am targeting staff-level impact over the next 2–3 years.",
        "Recruiter: attach CV *and* GitHub before the technical screen.",
        "### Realtime\nAny WebSockets / SignalR features in the product roadmap?",
        "Implemented chat fan-out with backpressure and reconnect policies.",
        "Are contractors considered, or employees only?",
        "## Accessibility\nWCAG target level for customer-facing UI?",
        "I have led audits to WCAG 2.2 AA with remediation trackers.",
        "Recruiter note: please avoid duplicate applications across sister brands.",
        "### Release\nFeature flags? Gradual rollout? Instant toggle?",
        "Used LaunchDarkly-style flags and kill switches for risky launches.",
        "What is the expected overlap with the previous engineer leaving the role?",
        "## Language mix\nDay-to-day English only, or mixed local language meetings?",
        "I can present in English; written docs are my default.",
        "Recruiter update: take-home should take **under 3 hours** — timed.",
        "### Architecture\nMonolith + modular boundaries, or many small services already?",
        "Happy to whiteboard bounded contexts and anti-corruption layers.",
        "Is stock / equity part of the package for senior hires?",
        "## Support\nHow do product and eng triage Sev-1 incidents together?",
        "I can share a sample severity matrix and communication templates.",
        "Recruiter: managers want evidence of **ownership**, not just tickets closed.",
        "### ML adjacent\nAny feature-store or scoring services the backend must integrate with?",
        "Built a thin feature retrieval API with Redis caching.",
        "Would a public blog post count as a portfolio sample?",
        "## UX research\nDo engineers join customer interviews occasionally?",
        "I find that short shadowing sessions improve backlog quality a lot.",
        "Recruiter ping: please confirm location tax residency before offer.",
        "### Legacy\nHow much time is spent modernizing older modules vs new features?",
        "Comfortable strangler-fig migrations with dual-write periods.",
        "Any preference for functional vs OOP style in new C# code?",
        "## Hiring timeline\nTarget start date this month or next quarter?",
        "I can start in three weeks after wrapping a current delivery.",
        "Recruiter update: final decision meeting is scheduled for Friday.",
        "### Closing note\nThanks for the transparent JD — looking forward to next steps.\n\n— Ready when you are.",
    ];

    public static IReadOnlyList<Definition> Build(IReadOnlyList<string> positionNames)
    {
        if (positionNames.Count == 0)
        {
            return [];
        }

        if (Bodies.Length != 100)
        {
            throw new InvalidOperationException($"Expected 100 unique mock messages, got {Bodies.Length}.");
        }

        var result = new List<Definition>(100);
        for (var index = 1; index <= 100; index++)
        {
            var positionName = positionNames[(index - 1) % positionNames.Count];
            var authorEmail = AuthorEmails[(index - 1) % AuthorEmails.Length];
            var body = Bodies[index - 1].ReplaceLineEndings("\n").Trim();
            var content = $"<!--mock-message:{index}-->\n{body}";

            result.Add(new Definition(index, positionName, authorEmail, content));
        }

        return result;
    }
}
