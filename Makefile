SHELL := /bin/sh
MOD ?=
MODS := $(sort $(notdir $(wildcard mods/*)))
# Accept the repository directory name as well as its short name. For example,
# MOD=zoom-hotkeys resolves to mods/sandustry-zoom-hotkeys.
MOD_DIR := $(or $(filter $(MOD),$(MODS)),$(filter sandustry-$(MOD),$(MODS)))
MOD_NAMES := $(sort $(patsubst sandustry-%,%,$(filter sandustry-%,$(MODS))) $(filter-out sandustry-%,$(MODS)))

.PHONY: all build install check format version major minor patch clean list-mods

all: build

list-mods:
	@printf '%s\n' $(MOD_NAMES)

build:
	@if [ -n "$(MOD)" ]; then if [ -z "$(MOD_DIR)" ]; then echo "Unknown MOD='$(MOD)'. Available mods: $(MOD_NAMES)" >&2; exit 2; fi; $(MAKE) -C "mods/$(MOD_DIR)" build; else for mod in $(MODS); do $(MAKE) -C "mods/$$mod" build || exit $$?; done; fi

install:
	@if [ -n "$(MOD)" ]; then if [ -z "$(MOD_DIR)" ]; then echo "Unknown MOD='$(MOD)'. Available mods: $(MOD_NAMES)" >&2; exit 2; fi; $(MAKE) -C "mods/$(MOD_DIR)" install; else for mod in $(MODS); do $(MAKE) -C "mods/$$mod" install || exit $$?; done; fi

check:
	@if [ -n "$(MOD)" ]; then if [ -z "$(MOD_DIR)" ]; then echo "Unknown MOD='$(MOD)'. Available mods: $(MOD_NAMES)" >&2; exit 2; fi; $(MAKE) -C "mods/$(MOD_DIR)" check; else npm run check && for mod in $(MODS); do $(MAKE) -C "mods/$$mod" check || exit $$?; done; fi

format:
	@if [ -n "$(MOD)" ]; then if [ -z "$(MOD_DIR)" ]; then echo "Unknown MOD='$(MOD)'. Available mods: $(MOD_NAMES)" >&2; exit 2; fi; $(MAKE) -C "mods/$(MOD_DIR)" format; else npm run format; fi

version:
	@if [ -z "$(MOD)" ]; then echo "Usage: make version MOD=<mod> major|minor|patch" >&2; exit 2; fi
	@if [ -z "$(MOD_DIR)" ]; then echo "Unknown MOD='$(MOD)'. Available mods: $(MOD_NAMES)" >&2; exit 2; fi
	@$(MAKE) -C "mods/$(MOD_DIR)" version "$(word 2,$(MAKECMDGOALS))"

# These are argument targets for `make version major|minor|patch`.
major minor patch:
	@:

clean:
	@if [ -n "$(MOD)" ]; then if [ -z "$(MOD_DIR)" ]; then echo "Unknown MOD='$(MOD)'. Available mods: $(MOD_NAMES)" >&2; exit 2; fi; $(MAKE) -C "mods/$(MOD_DIR)" clean; else for mod in $(MODS); do $(MAKE) -C "mods/$$mod" clean || exit $$?; done; fi
