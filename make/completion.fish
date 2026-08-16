# Fish completion for this repository's Makefile.
# Source this file from the repository root (or set SANDUSTRY_MODS_ROOT).

function __sandustry_make_mods
    set -l root .
    if set -q SANDUSTRY_MODS_ROOT
        set root $SANDUSTRY_MODS_ROOT
    end
    make -s --no-print-directory -C "$root" list-mods 2>/dev/null
end

function __sandustry_make_mod_prefix
    string match -q 'MOD=*' -- (commandline -ct)
end

complete -c make -n '__sandustry_make_mod_prefix' \
    -a '(__sandustry_make_mods | string replace -r "^" "MOD=")' \
    -d 'Mod'
complete -c make -n 'not __sandustry_make_mod_prefix' \
    -a 'all build install check format version major minor patch clean' \
    -d 'Make target'
