#!/bin/bash
# Frontmatter Validator for Fractary Commands
# Validates command frontmatter follows FRACTARY-PLUGIN-STANDARDS.md

set -euo pipefail

ARTIFACT_PATH="$1"
ARTIFACT_TYPE="${2:-command}"  # command, agent, or skill

if [ ! -f "$ARTIFACT_PATH" ]; then
    echo "Error: File not found: $ARTIFACT_PATH" >&2
    exit 1
fi

echo "🔍 Validating frontmatter for $ARTIFACT_TYPE: $ARTIFACT_PATH"
echo ""

ERRORS=0
WARNINGS=0

# Check if file starts with ---
if ! head -n1 "$ARTIFACT_PATH" | grep -q "^---$"; then
    echo "❌ Error: File must start with '---' (frontmatter)" >&2
    ((ERRORS++))
    exit 1
fi

# Extract frontmatter (between first two --- lines)
FRONTMATTER=$(awk '/^---$/{if(++count==2)exit;next}count==1' "$ARTIFACT_PATH")

if [ -z "$FRONTMATTER" ]; then
    echo "❌ Error: No frontmatter found" >&2
    exit 1
fi

echo "Checking required fields..."

# Check for 'name' field
if echo "$FRONTMATTER" | grep -q "^name:"; then
    NAME_VALUE=$(echo "$FRONTMATTER" | grep "^name:" | sed 's/^name: *//' | tr -d '"' | tr -d "'")
    echo "  ✅ name field present: $NAME_VALUE"

    # Validate name format based on artifact type
    if [ "$ARTIFACT_TYPE" = "command" ]; then
        # Command names should be kebab-case with plugin prefix, no leading slash
        if [[ "$NAME_VALUE" =~ ^/ ]]; then
            echo "  ❌ Error: Command name should not start with '/' (found: $NAME_VALUE)" >&2
            echo "     Use: ${NAME_VALUE#/}" >&2
            ((ERRORS++))
        elif [[ "$NAME_VALUE" =~ : ]]; then
            echo "  ❌ Error: Command name must not use colon namespace (use hyphens instead)" >&2
            echo "     Found: $NAME_VALUE" >&2
            ((ERRORS++))
        elif [[ ! "$NAME_VALUE" =~ ^[a-z0-9-]+$ ]]; then
            echo "  ⚠️  Warning: Command name should be lowercase with hyphens (e.g., fractary-forge-audit)" >&2
            echo "     Found: $NAME_VALUE" >&2
            ((WARNINGS++))
        fi
    elif [ "$ARTIFACT_TYPE" = "agent" ] || [ "$ARTIFACT_TYPE" = "skill" ]; then
        # Agent/skill names should be kebab-case
        if [[ ! "$NAME_VALUE" =~ ^[a-z0-9-]+$ ]]; then
            echo "  ⚠️  Warning: ${ARTIFACT_TYPE} name should be lowercase with hyphens" >&2
            echo "     Found: $NAME_VALUE" >&2
            ((WARNINGS++))
        fi
    fi
else
    echo "  ❌ Missing required field: name" >&2
    ((ERRORS++))
fi

# Check for 'description' field
if echo "$FRONTMATTER" | grep -q "^description:"; then
    DESC_VALUE=$(echo "$FRONTMATTER" | awk '/^description:/,/^[a-z]+:/' | sed '1d;$d' | sed 's/^  //')
    echo "  ✅ description field present"

    # Check description length (should be concise)
    DESC_LENGTH=$(echo "$DESC_VALUE" | wc -c)
    if [ "$DESC_LENGTH" -gt 1024 ]; then
        echo "  ⚠️  Warning: Description is very long (${DESC_LENGTH} chars, recommend < 1024)" >&2
        ((WARNINGS++))
    fi
else
    echo "  ⚠️  Warning: Missing recommended field: description" >&2
    ((WARNINGS++))
fi

# Check for 'tools' field (agents and skills)
if [ "$ARTIFACT_TYPE" = "agent" ] || [ "$ARTIFACT_TYPE" = "skill" ]; then
    if echo "$FRONTMATTER" | grep -q "^tools:"; then
        echo "  ✅ tools field present"
    else
        echo "  ⚠️  Warning: Missing recommended field: tools" >&2
        ((WARNINGS++))
    fi
fi

# Check for 'argument-hint' field (commands)
if [ "$ARTIFACT_TYPE" = "command" ]; then
    if echo "$FRONTMATTER" | grep -q "^argument-hint:"; then
        echo "  ✅ argument-hint field present"
    else
        echo "  ⚠️  Warning: Missing recommended field: argument-hint" >&2
        ((WARNINGS++))
    fi
fi

echo ""

# Check YAML syntax (basic check)
echo "Checking YAML syntax..."
if command -v python3 &> /dev/null; then
    if echo "$FRONTMATTER" | python3 -c "import sys, yaml; yaml.safe_load(sys.stdin)" 2>&1; then
        echo "  ✅ YAML syntax valid"
    else
        echo "  ❌ Error: Invalid YAML syntax" >&2
        ((ERRORS++))
    fi
else
    echo "  ⚠️  Skipping YAML syntax check (python3 not available)"
fi

echo ""

# Summary
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
if [ $ERRORS -eq 0 ] && [ $WARNINGS -eq 0 ]; then
    echo "✅ Validation passed: All frontmatter checks successful"
    exit 0
elif [ $ERRORS -eq 0 ]; then
    echo "⚠️  Validation passed with warnings: $WARNINGS warning(s)"
    exit 0
else
    echo "❌ Validation failed: $ERRORS error(s), $WARNINGS warning(s)"
    exit 1
fi
