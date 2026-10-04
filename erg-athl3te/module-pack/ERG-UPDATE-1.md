# Erg Race Board: update 1 (account button in the top bar)

1. Replace the whole `erg/` folder in the app root with the `erg/` folder from
   this pack. Do not edit anything inside it.
2. In `src/core/views.js`, function `wireAccountMenu`, inside the existing
   `if (pw) { ... }` block, right after the `pw.addEventListener('click', ...)`
   call, add:
```js
    // "Change my password" on the Erg Race Board (erg/) comes here to open it.
    try {
      if (sessionStorage.getItem('afmaster:openPw')) {
        sessionStorage.removeItem('afmaster:openPw');
        pw.click();
      }
    } catch (e) { /* private window */ }
```
Change nothing else.

Check at 1280×600:
- The board's top right shows "← Launcher" and your name · role with your
  initials, exactly like the Café.
- "Change my password" goes to the launcher with the password dialog open.
- "Log out" goes to the login.

Commit as: "Erg Race Board: the app's account button in its top bar".
