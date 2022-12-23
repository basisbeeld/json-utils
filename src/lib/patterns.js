/**
 * Regex to verify whether a positive digit is being used in a json path lookup.
 * This regex is in compliance with RFC 6901 (https://datatracker.ietf.org/doc/html/rfc6901).
 * Note: Leading 0 (00-09) are NOT matched, in compliance with the RFC spec.
 * @type {RegExp}
 */
export const digitRE = /^(0|[1-9]\d*)$/;
/**
 * Simple regex to verify whether a square-bracket notation within a json path is used.
 * @type {RegExp}
 */
export const objIdentifierRE = /[.[\]]/;
/**
 * Regex to verify whether a string contains a jsonb pattern.
 * @type {RegExp}
 */
export const jsonBPatternRE = /[^.[\]]+(:|:\[)[^.[\]]+/;
/**
 * Regex copied from the eslint rules to identify whether json paths of an object can be written with dot notation.
 * @type {RegExp}
 */
export const validObjectIdentifierDotNotationRE = /^[a-zA-Z_$][a-zA-Z0-9_$]*$/u;
