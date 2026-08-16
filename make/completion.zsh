# Zsh completion for this repository's Makefile.
# Source this file from the repository root (or set SANDUSTRY_MODS_ROOT).

_sandustry_make_completion() {
    local current="${words[CURRENT]}"
    local root="${SANDUSTRY_MODS_ROOT:-.}"
    local -a mods targets matches

    targets=(all build install check format version major minor patch clean)
    if [[ "$current" == MOD=* ]]; then
        mods=("${(@f)$(make -s --no-print-directory -C "$root" list-mods 2>/dev/null)}")
        matches=("${(@)mods/#/MOD=}")
        compadd -a matches
    else
        compadd -a targets
    fi
}

compdef _sandustry_make_completion make
