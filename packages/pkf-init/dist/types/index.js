/**
 * PKF Init Types
 * Core type definitions for the AI-assisted initialization system
 */
/**
 * Workflow stages
 */
export var WorkflowStage;
(function (WorkflowStage) {
    WorkflowStage["NOT_STARTED"] = "not_started";
    WorkflowStage["ANALYZING"] = "analyzing";
    WorkflowStage["DESIGNING"] = "designing";
    WorkflowStage["IMPLEMENTING"] = "implementing";
    WorkflowStage["MIGRATING"] = "migrating";
    WorkflowStage["COMPLETED"] = "completed";
    WorkflowStage["FAILED"] = "failed";
})(WorkflowStage || (WorkflowStage = {}));
/**
 * Available models with metadata
 */
export const AVAILABLE_MODELS = [
    {
        id: 'claude-sonnet-4-5-20250929',
        name: 'Claude Sonnet 4.5',
        description: 'Balanced - best for most tasks',
        inputCostPerMillion: 3,
        outputCostPerMillion: 15,
        recommended: true,
    },
    {
        id: 'claude-opus-4-5-20251101',
        name: 'Claude Opus 4.5',
        description: 'Most capable - complex reasoning',
        inputCostPerMillion: 15,
        outputCostPerMillion: 75,
    },
    {
        id: 'claude-haiku-4-5-20251001',
        name: 'Claude Haiku 4.5',
        description: 'Fast and cost-effective',
        inputCostPerMillion: 1,
        outputCostPerMillion: 5,
    },
];
//# sourceMappingURL=index.js.map