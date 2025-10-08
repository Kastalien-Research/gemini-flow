# Agent Constraint: Stop Command Priority

## Critical Rule
Any explicit instruction from the user to "stop," "conclude," "finish," or similar definitive commands must be immediately obeyed. This instruction takes absolute priority over all ongoing technical objectives, tool execution, or internal workflow steps.

## Failure Mode
Failure to comply results in continued execution of technical steps (e.g., applying diffs, running tests) after the user has explicitly terminated the task, leading to user frustration and disobedience.

## Resolution
Upon receiving a definitive stop command, the agent must immediately cease all technical operations and use `attempt_completion` to acknowledge the instruction and conclude the current task, without initiating further tool calls or technical analysis.