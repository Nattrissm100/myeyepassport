
# MyEyePassport (Refactor)

This refactor keeps **identical UI and functionality** while splitting the monolithic HTML into assets, CSS, and JS for easier maintenance and Netlify deployment.

## Structure
```
/assets
  eye.svg
  myeyepassport.svg
/css
  styles.css
/js
  app.js
index.html
```

## Notes
- Uses Tailwind CDN and face-api.js CDN same as original.
- All inline styles moved to `css/styles.css`.
- All inline scripts moved to `js/app.js` and exposed `navigateTo()` globally to keep existing `onclick` handlers working.
- Paths updated to use local `/assets` for images and favicon.
- Everything remains static – no build step required. Just deploy this folder to Netlify.
