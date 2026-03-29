#!/bin/bash
#
# cross-reference-validator.sh
#
# Validates cross-references in agents and skills to ensure invoked
# agents/skills actually exist in the plugin ecosystem.
#
# Usage: cross-reference-validator.sh <file_path> <artifact_type>
#
# Arguments:
#   file_path      - Path to the artifact file (agent or skill)
#   artifact_type  - Type of artifact: "agent" or "skill"
#
# Exit codes:
#   0 - All cross-references valid
#   1 - Missing cross-references found
#   2 - Invalid arguments
#
# Output:
#   Validation results in structured format

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Parse arguments
if [ $# -ne 2 ]; then
    echo "Usage: $0 <file_path> <artifact_type>" >&2
    echo "  artifact_type: agent | skill" >&2
    exit 2
fi

FILE_PATH="$1"
ARTIFACT_TYPE="$2"

# Validate artifact type
if [[ "$ARTIFACT_TYPE" != "agent" && "$ARTIFACT_TYPE" != "skill" ]]; then
    echo "Error: artifact_type must be 'agent' or 'skill'" >&2
    exit 2
fi

# Check file exists
if [ ! -f "$FILE_PATH" ]; then
    echo "Error: File not found: $FILE_PATH" >&2
    exit 2
fi

# Initialize counters
TOTAL_REFS=0
MISSING_REFS=0
WARNINGS=0

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Cross-Reference Validation"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "File: $FILE_PATH"
echo "Type: $ARTIFACT_TYPE"
echo ""

# Function to check if agent exists
check_agent_exists() {
    local agent_ref="$1"

    # Extract full agent name from @agent-{full-name} format
    if [[ "$agent_ref" =~ @agent-([a-z0-9][a-z0-9-]+) ]]; then
        local full_name="${BASH_REMATCH[1]}"

        # Search all plugin directories for matching agent file
        local found=false
        for agent_file in plugins/*/agents/"${full_name}.md"; do
            if [ -f "$agent_file" ]; then
                echo -e "  ${GREEN}✅${NC} Agent: $agent_ref → $agent_file"
                found=true
                break
            fi
        done

        if [ "$found" = true ]; then
            return 0
        else
            echo -e "  ${RED}❌${NC} Agent not found: $agent_ref"
            echo "      Searched: plugins/*/agents/${full_name}.md"
            return 1
        fi
    else
        echo -e "  ${YELLOW}⚠${NC} Invalid agent reference format: $agent_ref"
        echo "      Expected: @agent-{name}"
        return 2
    fi
}

# Function to check if skill exists
check_skill_exists() {
    local skill_ref="$1"

    # Extract full skill name from @skill-{full-name} format
    if [[ "$skill_ref" =~ @skill-([a-z0-9][a-z0-9-]+) ]]; then
        local full_name="${BASH_REMATCH[1]}"

        # Search all plugin directories for matching skill (directory or file)
        local found=false
        for skill_dir in plugins/*/skills/"${full_name}"/SKILL.md; do
            if [ -f "$skill_dir" ]; then
                echo -e "  ${GREEN}✅${NC} Skill: $skill_ref → $skill_dir"
                found=true
                break
            fi
        done

        if [ "$found" = false ]; then
            for skill_file in plugins/*/skills/"${full_name}.md"; do
                if [ -f "$skill_file" ]; then
                    echo -e "  ${GREEN}✅${NC} Skill: $skill_ref → $skill_file"
                    found=true
                    break
                fi
            done
        fi

        if [ "$found" = true ]; then
            return 0
        else
            echo -e "  ${RED}❌${NC} Skill not found: $skill_ref"
            echo "      Searched: plugins/*/skills/${full_name}/SKILL.md and plugins/*/skills/${full_name}.md"
            return 1
        fi
    else
        echo -e "  ${YELLOW}⚠${NC} Invalid skill reference format: $skill_ref"
        echo "      Expected: @skill-{name}"
        return 2
    fi
}

# Extract agent references
echo "Checking agent references..."
AGENT_REFS=$(grep -oP '@agent-[a-z0-9]+-[a-z0-9-]+' "$FILE_PATH" 2>/dev/null || true)

if [ -z "$AGENT_REFS" ]; then
    echo "  No agent references found"
else
    while IFS= read -r agent_ref; do
        TOTAL_REFS=$((TOTAL_REFS + 1))
        if ! check_agent_exists "$agent_ref"; then
            if [ $? -eq 1 ]; then
                MISSING_REFS=$((MISSING_REFS + 1))
            else
                WARNINGS=$((WARNINGS + 1))
            fi
        fi
    done <<< "$AGENT_REFS"
fi

echo ""

# Extract skill references
echo "Checking skill references..."
SKILL_REFS=$(grep -oP '@skill-[a-z0-9]+-[a-z0-9-]+' "$FILE_PATH" 2>/dev/null || true)

if [ -z "$SKILL_REFS" ]; then
    echo "  No skill references found"
else
    while IFS= read -r skill_ref; do
        TOTAL_REFS=$((TOTAL_REFS + 1))
        if ! check_skill_exists "$skill_ref"; then
            if [ $? -eq 1 ]; then
                MISSING_REFS=$((MISSING_REFS + 1))
            else
                WARNINGS=$((WARNINGS + 1))
            fi
        fi
    done <<< "$SKILL_REFS"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Summary"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Total references: $TOTAL_REFS"
echo "Missing references: $MISSING_REFS"
echo "Warnings: $WARNINGS"
echo ""

# Exit based on results
if [ $MISSING_REFS -gt 0 ]; then
    echo -e "${RED}FAILED${NC}: $MISSING_REFS missing references found"
    exit 1
elif [ $WARNINGS -gt 0 ]; then
    echo -e "${YELLOW}PASSED WITH WARNINGS${NC}: $WARNINGS reference warnings"
    exit 0
else
    echo -e "${GREEN}PASSED${NC}: All references valid"
    exit 0
fi
