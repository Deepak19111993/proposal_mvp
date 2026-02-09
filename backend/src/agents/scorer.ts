import { FitDecision, RequirementsMatrix, ClientPersona, DomainRouting } from './types.js';

export const scoreFit = (matrix: RequirementsMatrix, persona: ClientPersona, routing: DomainRouting): FitDecision => {
    let score = 0;
    const reasoning: string[] = [];

    // 1. Domain Alignment (40 pts)
    // Assume user is capable in the routing domain for now (Enforcement happens at service level)
    score += 40;
    reasoning.push("Primary domain matches user expertise (assumed)");

    // 2. Feasibility / Ambiguity (30 pts)
    const ambiguityPenalty = persona.ambiguityLevel === 'HIGH' ? 0 : (persona.ambiguityLevel === 'MEDIUM' ? 15 : 30);
    score += ambiguityPenalty;
    reasoning.push(`Ambiguity level is ${persona.ambiguityLevel} (+${ambiguityPenalty})`);

    // 3. Client Quality (30 pts)
    let clientScore = 5; // Baseline
    if (persona.hasBudget) {
        clientScore += 15;
        reasoning.push("Client has budget (+15)");
    }
    if (persona.urgency === 'HIGH') {
        clientScore += 10;
        reasoning.push("High urgency (+10)");
    }
    score += clientScore;

    // Decision
    let route: 'PROCEED' | 'BORDERLINE' | 'REJECT' = 'REJECT';
    if (score >= 70) route = 'PROCEED';
    else if (score >= 50) route = 'BORDERLINE';

    return { score, route, reasoning };
};
