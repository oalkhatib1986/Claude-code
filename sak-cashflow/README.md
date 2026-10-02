# Family Cash Flow app

A single-file web app (`index.html`) for an 8-month family cash-flow report by country, with:

- A total summary page and one summary page per country, laid out as A4-landscape sheets
- Click-through pages for every figure: money in, money out, single months, single items and bank accounts
- Inline editing: change any month, add or delete items, accounts, households and money-in sources, and leave items out of the totals
- An assumptions page for notes, month labels and report details
- PDF export (A4 landscape, same design as the screens), built in the browser with jsPDF and html2canvas from cdnjs

This copy ships with **no figures**. Load your data with **Assumptions → Load data file** (the JSON you get from **Download data file** in the hosted version), or seed it from Firestore as described below.

## Data shape

```json
{
  "settings":   { "title", "months": ["Oct 2026", ...], "openingDate", "closingDate", "currency", "events": { "1": "UAB deposit" } },
  "countries":  [{ "id": "uae", "name": "UAE", "code": "AE" }],
  "households": [{ "id", "name", "country", "color" }],
  "categories": ["Fixed deposits", ...],
  "accounts":   [{ "id", "bank", "holder", "country", "balance" }],
  "inflows":    [{ "id": "i1", "category", "name", "account", "maturity", "renew", "note", "amounts": [8 numbers], "on": false? }],
  "outflows":   [{ "id": "o1", "household", "name", "frequency", "note", "amounts": [8 numbers], "on": false? }],
  "notes":      ["..."]
}
```

Money in counts toward the country of the account it is paid into. Money out counts toward the country of its household.

## Where data is saved

The app chooses its storage in this order:

1. `window.SAK_STORE`, if defined: `{ load(): Promise<data|null>, save(data): Promise<void> }`
2. The claude.ai artifact runtime, if present (the page republishes itself)
3. `localStorage` in the current browser (fallback only; not shared and not backed up)

## Hosting on Firebase with logins

1. `firebase init hosting` and put `index.html` in the public folder.
2. Enable **Authentication** (Google or email link) and **Cloud Firestore**.
3. Before the app's own scripts, add the Firebase SDK and define `window.SAK_STORE`. Gate the page behind sign-in and store the whole data object in one document:

```html
<script type="module">
  import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
  import { getAuth, onAuthStateChanged, signInWithPopup, GoogleAuthProvider } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
  import { getFirestore, doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
  const app = initializeApp({ /* your config */ });
  const auth = getAuth(app), db = getFirestore(app);
  const ref = doc(db, "cashflow", "family");
  const user = await new Promise(r => onAuthStateChanged(auth, u => u ? r(u) : signInWithPopup(auth, new GoogleAuthProvider())));
  window.SAK_STORE = {
    load: async () => (await getDoc(ref)).data() || null,
    save: data => setDoc(ref, data)
  };
</script>
```

   Because the app script runs immediately, load it after `SAK_STORE` is set (for example, inject the app's `<script id="main">` from this module, or move it into a module that runs after sign-in).

4. Restrict Firestore with rules so only family members can read and write, for example:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{db}/documents {
    match /cashflow/{doc} {
      allow read, write: if request.auth != null
        && request.auth.token.email in ['you@example.com', 'family@example.com'];
    }
  }
}
```

5. In the hosted app, use **Assumptions → Load data file** once to bring in your figures, then **Save changes**.
