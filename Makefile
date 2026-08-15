MOD_DIR := mod
MOD_ID := sorahn.sandustry-test-blocks
MOD_NAME := sandustry-test-blocks
MOD_VERSION := 0.1.0
ARCHIVE := $(MOD_NAME)-$(MOD_VERSION).zip

# Override this on another machine with:
#   make install SANDUSTRY_MODS_DIR=/path/to/sandustry/mods
SANDUSTRY_MODS_DIR ?= /Users/daryl/Library/Application Support/sandustry/mods
INSTALL_DIR := $(SANDUSTRY_MODS_DIR)/$(MOD_ID)

.PHONY: all build format pre-install install clean

all: build

build: $(ARCHIVE)

format:
	prettier --write "$(MOD_DIR)/entry.js"

pre-install: format

$(ARCHIVE): $(shell find $(MOD_DIR) -type f -print)
	rm -f "$@"
	cd "$(MOD_DIR)" && zip -qr "../$@" .

install: pre-install build
	mkdir -p "$(INSTALL_DIR)"
	cp -R "$(MOD_DIR)/." "$(INSTALL_DIR)/"
	@echo "Installed unzipped $(MOD_ID) mod to $(INSTALL_DIR)"

clean:
	rm -f "$(ARCHIVE)"
