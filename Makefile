SHELL := /bin/sh
MOD ?=
MODS := $(sort $(notdir $(wildcard mods/*)))

.PHONY: all build install check format version major minor patch clean

all: build

build:
	@if [ -n "$(MOD)" ]; then case " $(MODS) " in *" $(MOD) "*) ;; *) echo "Unknown MOD='$(MOD)'. Available mods: $(MODS)" >&2; exit 2;; esac; $(MAKE) -C "mods/$(MOD)" build; else for mod in $(MODS); do $(MAKE) -C "mods/$$mod" build || exit $$?; done; fi

install:
	@if [ -n "$(MOD)" ]; then case " $(MODS) " in *" $(MOD) "*) ;; *) echo "Unknown MOD='$(MOD)'. Available mods: $(MODS)" >&2; exit 2;; esac; $(MAKE) -C "mods/$(MOD)" install; else for mod in $(MODS); do $(MAKE) -C "mods/$$mod" install || exit $$?; done; fi

check:
	@npm run check
	@if [ -n "$(MOD)" ]; then case " $(MODS) " in *" $(MOD) "*) ;; *) echo "Unknown MOD='$(MOD)'. Available mods: $(MODS)" >&2; exit 2;; esac; $(MAKE) -C "mods/$(MOD)" check; else for mod in $(MODS); do $(MAKE) -C "mods/$$mod" check || exit $$?; done; fi

format:
	@npm run format

version:
	@if [ -z "$(MOD)" ]; then echo "Usage: make version MOD=<mod> major|minor|patch" >&2; exit 2; fi
	@case " $(MODS) " in *" $(MOD) "*) ;; *) echo "Unknown MOD='$(MOD)'. Available mods: $(MODS)" >&2; exit 2;; esac
	@$(MAKE) -C "mods/$(MOD)" version "$(word 2,$(MAKECMDGOALS))"

# These are argument targets for `make version major|minor|patch`.
major minor patch:
	@:

clean:
	@if [ -n "$(MOD)" ]; then case " $(MODS) " in *" $(MOD) "*) ;; *) echo "Unknown MOD='$(MOD)'. Available mods: $(MODS)" >&2; exit 2;; esac; $(MAKE) -C "mods/$(MOD)" clean; else for mod in $(MODS); do $(MAKE) -C "mods/$$mod" clean || exit $$?; done; fi
