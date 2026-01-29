# Documentation Reorganization Plan

**Created**: 2026-01-28
**Status**: Ready for Review
**Impact**: Low risk - file moves only, no code changes

## Executive Summary

The project root has accumulated 45+ markdown files mixing status reports, implementation summaries, and guides. This plan consolidates them into `docs/` while preserving conventional locations and co-located documentation patterns.

---

## Current State Analysis

### Files by Category (Root Directory)

| Category | Count | Examples |
|----------|-------|----------|
| Status Reports | 15 | `*_COMPLETE.md`, `*_STATUS.md`, `FINAL_*.md` |
| Implementation Docs | 12 | `*_IMPLEMENTATION.md`, `*_SUMMARY.md` |
| Security Docs | 6 | `SECURITY*.md`, `OWASP*.md`, `ZAP*.md` |
| Architecture | 3 | `ARCHITECTURE*.md` |
| Guides | 5 | `*_GUIDE.md`, `CONTRIBUTING.md`, `DEVELOPER_*.md` |
| Business/Funding | 4 | `BUSINESS_*.md`, `FUNDING_*.md`, `PRICING_*.md` |

### Files That MUST Stay at Root

| File | Reason |
|------|--------|
| `README.md` | Standard project entry point |
| `CLAUDE.md` | Claude Code configuration (required location) |
| `CONTRIBUTING.md` | GitHub convention for contributors |
| `SECURITY.md` | GitHub security policy convention |

### Files That Should Stay Co-located

| Location | Files | Reason |
|----------|-------|--------|
| `.claude/` | All | Claude Code tool configuration |
| `.serena/` | All | Serena AI memory files |
| `.specify/` | All | Specify workflow templates |
| `.github/` | All | GitHub platform requirements |
| `backend/src/features/*/README.md` | All | Feature documentation near code |
| `mobile/docs/` | All | Mobile-specific guides |
| `specs/` | All | Feature specifications |

---

## Target Structure

```
docs/
├── README.md                    # Documentation index (update existing)
├── architecture/
│   ├── ARCHITECTURE.md
│   ├── ARCHITECTURE_ASSESSMENT.md
│   └── SECURITY_AND_COMPLEXITY_ANALYSIS.md
│
├── security/
│   ├── BETA_LAUNCH_SECURITY_SUMMARY.md
│   ├── SECURITY_IMPLEMENTATION_SUMMARY.md
│   ├── SECURITY_TESTING_GUIDE.md
│   ├── OWASP_ZAP_SETUP.md
│   └── ZAP_QUICK_START.md
│
├── implementation/
│   ├── IMPLEMENTATION.md
│   ├── AUDIT_LOG_COMPLIANCE_IMPLEMENTATION.md
│   ├── ENHANCED_SCORING_IMPLEMENTATION.md
│   ├── HOUSEHOLD_IMPLEMENTATION_SUMMARY.md
│   ├── MESSAGING_IMPLEMENTATION.md
│   ├── VERIFICATION_INTEGRATION_COMPLETE.md
│   ├── BACKEND_INTEGRATION_COMPLETE.md
│   └── FHA_COMPLIANCE_COMPLETE.md
│
├── status-reports/
│   ├── FINAL_STATUS_REPORT.md
│   ├── BUILD_STATUS_COMPLETE.md
│   ├── MESSAGING_COMPLETION_STATUS.md
│   ├── PHASE1_CLEANUP_COMPLETE.md
│   ├── PHASE_3_COMPLETION_SUMMARY.md
│   ├── ADMIN_PORTAL_COMPLETE.md
│   ├── SAVED_PROFILES_FIXES_COMPLETE.md
│   └── BRANDING_UPDATE_SUMMARY.md
│
├── guides/
│   ├── DEVELOPER_ONBOARDING.md
│   ├── CODE_QUALITY_STANDARDS.md
│   ├── CODE_REVIEW_CHECKLIST.md
│   ├── AI_CODE_CHECKLIST.md
│   ├── DEPLOYMENT_CHECKLIST.md
│   ├── SPEC_KIT_GUIDE.md
│   └── UI_DESIGN.md
│
├── testing/
│   ├── TEST_COVERAGE_ANALYSIS.md
│   ├── TEST_PROFILES.md
│   └── TEST_REPORT.md
│
├── business/
│   ├── BUSINESS_SUMMARY.md
│   ├── FUNDING_OPPORTUNITIES.md
│   ├── CONEST_FUNDING_ROADMAP_2025-2026.md
│   ├── PRICING_MODEL_UPDATE_2025-01-11.md
│   └── PROJECT_ROADMAP.md
│
├── planning/
│   ├── PROJECT_SUMMARY.md
│   ├── DOCUMENTATION_CLEANUP_PLAN.md
│   ├── DOCUMENTATION_INDEX.md
│   ├── REFACTOR_MIGRATION_PLAN.md
│   ├── MIGRATION_TASKS.md
│   └── SAFETY_FEATURE_DESIGNS.md
│
└── archive/                     # Already exists
    ├── outdated/
    └── sessions/
```

---

## Migration Script

```bash
#!/bin/bash
# Execute from project root: /Users/ghostmac/Development/conest

set -e

# Create new directories
mkdir -p docs/{architecture,security,implementation,status-reports,guides,testing,business,planning}

# Architecture
mv ARCHITECTURE.md docs/architecture/
mv ARCHITECTURE_ASSESSMENT.md docs/architecture/
mv SECURITY_AND_COMPLEXITY_ANALYSIS.md docs/architecture/

# Security
mv BETA_LAUNCH_SECURITY_SUMMARY.md docs/security/
mv SECURITY_IMPLEMENTATION_SUMMARY.md docs/security/
mv SECURITY_TESTING_GUIDE.md docs/security/
mv OWASP_ZAP_SETUP.md docs/security/
mv ZAP_QUICK_START.md docs/security/

# Implementation
mv IMPLEMENTATION.md docs/implementation/
mv AUDIT_LOG_COMPLIANCE_IMPLEMENTATION.md docs/implementation/
mv ENHANCED_SCORING_IMPLEMENTATION.md docs/implementation/
mv HOUSEHOLD_IMPLEMENTATION_SUMMARY.md docs/implementation/
mv MESSAGING_IMPLEMENTATION.md docs/implementation/
mv VERIFICATION_INTEGRATION_COMPLETE.md docs/implementation/
mv BACKEND_INTEGRATION_COMPLETE.md docs/implementation/
mv FHA_COMPLIANCE_COMPLETE.md docs/implementation/

# Status Reports
mv FINAL_STATUS_REPORT.md docs/status-reports/
mv BUILD_STATUS_COMPLETE.md docs/status-reports/
mv MESSAGING_COMPLETION_STATUS.md docs/status-reports/
mv PHASE1_CLEANUP_COMPLETE.md docs/status-reports/
mv PHASE_3_COMPLETION_SUMMARY.md docs/status-reports/
mv ADMIN_PORTAL_COMPLETE.md docs/status-reports/
mv SAVED_PROFILES_FIXES_COMPLETE.md docs/status-reports/
mv BRANDING_UPDATE_SUMMARY.md docs/status-reports/

# Guides
mv DEVELOPER_ONBOARDING.md docs/guides/
mv CODE_QUALITY_STANDARDS.md docs/guides/
mv CODE_REVIEW_CHECKLIST.md docs/guides/
mv AI_CODE_CHECKLIST.md docs/guides/
mv DEPLOYMENT_CHECKLIST.md docs/guides/
mv SPEC_KIT_GUIDE.md docs/guides/
mv UI_DESIGN.md docs/guides/

# Testing
mv TEST_COVERAGE_ANALYSIS.md docs/testing/
mv TEST_PROFILES.md docs/testing/
mv TEST_REPORT.md docs/testing/

# Business
mv BUSINESS_SUMMARY.md docs/business/
mv FUNDING_OPPORTUNITIES.md docs/business/
mv CONEST_FUNDING_ROADMAP_2025-2026.md docs/business/
mv PRICING_MODEL_UPDATE_2025-01-11.md docs/business/
mv PROJECT_ROADMAP.md docs/business/

# Planning
mv PROJECT_SUMMARY.md docs/planning/
mv DOCUMENTATION_CLEANUP_PLAN.md docs/planning/ 2>/dev/null || true
mv DOCUMENTATION_INDEX.md docs/planning/
mv REFACTOR_MIGRATION_PLAN.md docs/planning/
mv MIGRATION_TASKS.md docs/planning/
mv SAFETY_FEATURE_DESIGNS.md docs/planning/

# Move LOGIN_CREDENTIALS.md to a secure location (or delete if not needed)
# WARNING: This file may contain sensitive data
# mv LOGIN_CREDENTIALS.md docs/archive/

echo "Migration complete. Verify with: ls -la && ls -la docs/*/"
```

---

## Post-Migration Tasks

### 1. Update Cross-References
After moving files, update any internal links in:
- `README.md` - Update documentation links
- `CLAUDE.md` - Verify referenced files
- `docs/DOCUMENTATION_INDEX.md` - Update to reflect new structure

### 2. Update .gitignore (if needed)
Ensure `docs/archive/` patterns still work correctly.

### 3. Verify No Broken Links
```bash
# Find potential broken links
grep -r "](.*\.md)" docs/ | grep -v node_modules
```

---

## Files Remaining at Root (After Cleanup)

```
/Users/ghostmac/Development/conest/
├── README.md              # Project entry point
├── CLAUDE.md              # Claude Code config
├── CONTRIBUTING.md        # Contributor guide
├── SECURITY.md            # Security policy
└── docker-compose.yml     # (not markdown, but for reference)
```

**Total files moved**: ~40
**Root directory reduction**: 45 files → 4 files

---

## Rollback Plan

If issues arise, restore from git:
```bash
git checkout HEAD -- *.md
rm -rf docs/{architecture,security,implementation,status-reports,guides,testing,business,planning}
```

---

## Approval Checklist

- [ ] Review target structure
- [ ] Verify no critical files are being moved inappropriately
- [ ] Confirm LOGIN_CREDENTIALS.md handling (sensitive file)
- [ ] Ready to execute migration script

**Ready to execute?** Reply with approval to run the migration.
