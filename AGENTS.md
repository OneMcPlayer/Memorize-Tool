# AGENTS.md

## E2E Verification Artifacts

- For every new or changed user-visible feature, prefer validating it with a real browser end-to-end check when the environment allows it.
- When possible, produce a short video of the feature working as part of the E2E verification result.
- Save video artifacts in `artifacts/videos/` with a descriptive filename tied to the feature or flow being tested.
- In the final response, include the exact path to the video artifact so it can be reviewed easily, including from mobile.
- If video capture is not possible, say why and provide the next best artifact, such as screenshots, a trace, or a concise browser test summary.
- If the default E2E tool cannot record video in the current environment, use another available browser tool when practical instead of skipping the artifact entirely.
