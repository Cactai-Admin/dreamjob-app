# Activation Upgrade Integration Notes

## Google auth
Google OAuth is already configured in Supabase, but the app login screen still needs:
- Google sign-in entry point
- create-account / signup path
- first-login account provisioning
- proper callback/session wiring in app code

## Google Drive / Docs
Decide whether the primary action should be:
- create native Google Docs
- upload DOCX to Drive
- || support both

Recommended default:
- support both
- native Google Docs as primary
- DOCX download as secondary

## LinkedIn hosted environment
Current LinkedIn auth/session behavior appears local-only.
You will likely need:
- a hosted browser/session broker || equivalent companion layer
- environment variables for hosted session orchestration
- UI states that correctly explain when the feature is unavailable

## AI contract
Do not let:
- parse
- chat
- generation
all use different shapes of listing truth.
One canonical listing contract should feed them all.
