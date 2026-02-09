export interface ClientPersona {
    technicalLevel: 'TECHNICAL' | 'NON_TECHNICAL' | 'MIXED';
    tone: 'CASUAL' | 'PROFESSIONAL' | 'URGENT' | 'STRICT';
    urgency: 'LOW' | 'MEDIUM' | 'HIGH';
    hasBudget: boolean;
    ambiguityLevel: 'LOW' | 'MEDIUM' | 'HIGH';
}

export interface DomainRouting {
    primaryDomain: 'Fullstack' | 'GenAI' | 'AI_ML' | 'DevOps';
    secondaryDomains: string[];
    confidence: number;
}

export interface RequirementsMatrix {
    explicit: string[];
    implied: string[];
    constraints: string[];
    ambiguities: string[];
    risks: string[];
    clarifyingQuestions: { question: string; type: 'MUST_ASK' | 'GOOD_TO_ASK' }[];
}

export interface FitDecision {
    score: number;
    route: 'PROCEED' | 'BORDERLINE' | 'REJECT';
    reasoning: string[];
}
