/* This function escapes HTML special characters in a string to prevent XSS attacks...
...and ensure that the string is safe to be rendered in HTML. It replaces the characters with their corresponding HTML entities 
...and returns the escaped string. If the input value is null or undefined, it returns an empty string */

export function escapeHtml(value) {
    return String(value ?? '')
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#039;');
}
