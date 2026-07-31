/* ===========================================================================
   COMPOSE — shared download helpers

   Until S39 this file also built self-contained student HTML exports
   (buildStudentHtml + the Export-assignment modal, S13.3). HTML exercise
   import/export was removed as a product function — worksheets are shared
   through unlock codes (N5) or as .compose.json files. Only the small
   download helpers the rest of the app uses remain.
   =========================================================================== */
function composeDownload(filename, data, mime) {
  const blob = new Blob([data], { type: mime || 'application/octet-stream' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}
function composeSlug(s) { return (String(s || '').trim() || 'exercise').replace(/[^a-z0-9]+/gi, '-').toLowerCase().replace(/^-+|-+$/g, '') || 'exercise'; }

window.composeDownload = composeDownload;
window.composeSlug = composeSlug;
