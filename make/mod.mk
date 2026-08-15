SHELL := /bin/sh
MOD_DIR := $(abspath $(MOD_DIR))
REPO_ROOT ?= $(abspath $(MOD_DIR)/../..)
SRC_DIR := $(MOD_DIR)/src
BUILD_DIR := $(MOD_DIR)/build
MANIFEST := $(MOD_DIR)/modinfo.json
MOD_ID := $(shell node -p 'require("$(MANIFEST)").id')
MOD_NAME := $(shell node -p 'require("$(MANIFEST)").name.toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$$/g,"")')
MOD_VERSION := $(shell node -p 'require("$(MANIFEST)").version')
ARTIFACTS_DIR := $(REPO_ROOT)/artifacts
ARCHIVE := $(ARTIFACTS_DIR)/$(MOD_NAME)-$(MOD_VERSION).zip
PACKAGE_DIR := $(BUILD_DIR)/package
SANDUSTRY_MODS_DIR ?= /Users/daryl/Library/Application Support/sandustry/mods
INSTALL_DIR := $(SANDUSTRY_MODS_DIR)/$(MOD_ID)

.PHONY: all build package install check format version major minor patch clean
all: build
build: $(ARCHIVE)

$(BUILD_DIR)/entry.js: $(SRC_DIR)/entry.tsx $(REPO_ROOT)/tsconfig.json $(REPO_ROOT)/types/sandustry.d.ts
	@mkdir -p "$(BUILD_DIR)"
	@echo "Compiling $(MOD_ID)"
	@cd "$(REPO_ROOT)" && npx tsc --noEmit
	@cd "$(REPO_ROOT)" && npx esbuild "$(SRC_DIR)/entry.tsx" --bundle --format=esm --platform=neutral --target=es2022 --jsx-factory=sandkit.react.createElement --jsx-fragment=sandkit.react.Fragment --alias:~shared="$(REPO_ROOT)/shared" --outfile="$(BUILD_DIR)/entry.js"

$(ARCHIVE): $(BUILD_DIR)/entry.js $(MANIFEST) $(shell find $(MOD_DIR)/assets -type f -print 2>/dev/null) $(wildcard $(MOD_DIR)/preview.png $(MOD_DIR)/workshop.json)
	@rm -rf "$(PACKAGE_DIR)"
	@mkdir -p "$(PACKAGE_DIR)/assets"
	@cp "$(BUILD_DIR)/entry.js" "$(PACKAGE_DIR)/entry.js"
	@cp "$(MANIFEST)" "$(PACKAGE_DIR)/modinfo.json"
	@cp -R "$(MOD_DIR)/assets/." "$(PACKAGE_DIR)/assets/"
	@if [ -f "$(MOD_DIR)/preview.png" ]; then cp "$(MOD_DIR)/preview.png" "$(PACKAGE_DIR)/preview.png"; fi
	@if [ -f "$(MOD_DIR)/workshop.json" ]; then cp "$(MOD_DIR)/workshop.json" "$(PACKAGE_DIR)/workshop.json"; fi
	@mkdir -p "$(ARTIFACTS_DIR)"
	@rm -f "$(ARCHIVE)"
	@cd "$(PACKAGE_DIR)" && zip -qr "$(ARCHIVE)" .
	@echo "Built $(ARCHIVE)"

package: $(ARCHIVE)
install: $(ARCHIVE)
	@mkdir -p "$(INSTALL_DIR)"
	@cp -R "$(PACKAGE_DIR)/." "$(INSTALL_DIR)/"
	@echo "Installed unzipped $(MOD_ID) mod to $(INSTALL_DIR)"

check: $(ARCHIVE)
	@cd "$(REPO_ROOT)" && npx tsc --noEmit
	@node --check "$(BUILD_DIR)/entry.js"
	@cd "$(REPO_ROOT)" && npx oxlint "$(SRC_DIR)"
	@cd "$(REPO_ROOT)" && npx oxfmt --check "$(SRC_DIR)" "$(MANIFEST)"
	@node "$(REPO_ROOT)/scripts/validate-mod.mjs" "$(MOD_DIR)" "$(ARCHIVE)"

format:
	@cd "$(REPO_ROOT)" && npx oxfmt --write "$(SRC_DIR)" "$(MANIFEST)"

version:
	@if [ "$(word 2,$(MAKECMDGOALS))" != "major" ] && [ "$(word 2,$(MAKECMDGOALS))" != "minor" ] && [ "$(word 2,$(MAKECMDGOALS))" != "patch" ]; then echo "Usage: make version major|minor|patch" >&2; exit 2; fi
	@node "$(REPO_ROOT)/scripts/bump-version.mjs" "$(MANIFEST)" "$(word 2,$(MAKECMDGOALS))"
	@git add -- "$(MANIFEST)"
	@git commit -m "version incremented: v$$(node -p 'require("$(MANIFEST)").version')" -- "$(MANIFEST)"
	@$(MAKE) install
major minor patch:
	@:
clean:
	@rm -rf "$(BUILD_DIR)" "$(ARCHIVE)"
