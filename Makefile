MOD_DIR := mod
MOD_ID := sorahn.sandustry-test-blocks
MOD_NAME := sandustry-test-blocks
MOD_VERSION := $(shell node -p 'require("./mod/modinfo.json").version')
ARCHIVE := $(MOD_NAME)-$(MOD_VERSION).zip

# Override this on another machine with:
#   make install SANDUSTRY_MODS_DIR=/path/to/sandustry/mods
SANDUSTRY_MODS_DIR ?= /Users/daryl/Library/Application Support/sandustry/mods
INSTALL_DIR := $(SANDUSTRY_MODS_DIR)/$(MOD_ID)

.PHONY: all build format pre-install install version major minor patch clean

all: build

build: $(ARCHIVE)

format:
	prettier --write "$(MOD_DIR)/entry.js"

pre-install: format

# Usage: make version major|minor|patch
# Only mod/modinfo.json is staged and committed by this target.
version:
	@if [ -z "$(word 2,$(MAKECMDGOALS))" ] || ! printf '%s\n' major minor patch | grep -qx "$(word 2,$(MAKECMDGOALS))"; then \
		echo "Usage: make version major|minor|patch"; \
		exit 2; \
	fi
	node -e 'const fs=require("fs"); const part=process.argv[1]; const path="mod/modinfo.json"; const manifest=JSON.parse(fs.readFileSync(path,"utf8")); const version=manifest.version.split(".").map(Number); const index={major:0,minor:1,patch:2}[part]; if (version.length !== 3 || version.some(Number.isNaN)) throw new Error("modinfo version must be major.minor.patch"); version[index] += 1; for (let i=index+1;i<3;i+=1) version[i]=0; manifest.version=version.join("."); fs.writeFileSync(path, JSON.stringify(manifest,null,2)+"\n");' "$(word 2,$(MAKECMDGOALS))"
	git add -- mod/modinfo.json
	git commit -m "version incremented: v$$(node -p 'require("./mod/modinfo.json").version')" -- mod/modinfo.json

# These are argument targets for `make version major|minor|patch`.
major minor patch:
	@:

$(ARCHIVE): $(shell find $(MOD_DIR) -type f -print)
	rm -f "$@"
	cd "$(MOD_DIR)" && zip -qr "../$@" .

install: pre-install build
	mkdir -p "$(INSTALL_DIR)"
	cp -R "$(MOD_DIR)/." "$(INSTALL_DIR)/"
	@echo "Installed unzipped $(MOD_ID) mod to $(INSTALL_DIR)"

clean:
	rm -f "$(ARCHIVE)"
