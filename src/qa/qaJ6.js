// QA J6: semgrep typescript.react.security.react-insecure-request (ERROR) trigger, not used
export const qaJ6InsecureRequest = () => fetch("http://qa-canary.invalid/J6");
