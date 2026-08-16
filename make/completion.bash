# Bash completion for this repository's Makefile.
# Source this file from the repository root (or set SANDUSTRY_MODS_ROOT).

_sandustry_make_completion() {
    local current="${COMP_WORDS[COMP_CWORD]}"
    local root="${SANDUSTRY_MODS_ROOT:-.}"
    local mods targets

    targets="all build install check format version major minor patch clean"
    if [[ "$current" == MOD=* ]]; then
        mods="$(make -s --no-print-directory -C "$root" list-mods 2>/dev/null)"
        COMPREPLY=( $(compgen -W "$(printf 'MOD=%s\n' $mods)" -- "$current") )
    else
        COMPREPLY=( $(compgen -W "$targets" -- "$current") )
    fi
}

complete -F _sandustry_make_completion make
