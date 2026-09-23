/* Store-Freischaltung für die ganze Website.
   Solange live: false, sind Badges und "App laden" Platzhalter: kein Sprung auf eine
   leere Store-Seite, stattdessen der Hinweis "bald erhältlich".
   Zum Start der jeweiligen App nur hier live auf true setzen. */
window.HEIMSTART_STORES = {
  apple:  { live: false, url: 'https://apps.apple.com/de/app/id6809733214' },
  google: { live: false, url: 'https://play.google.com/store/apps/details?id=com.aistudio.movemaster.app.dcbcae' }
};
