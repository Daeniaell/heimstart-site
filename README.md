# heimstart.de

Website der Heimstart-App (Android und iOS): Startseite plus Pflichtseiten Datenschutz,
Support, Kontolöschung und Impressum. Ausgeliefert über GitHub Pages, Zieladresse https://heimstart.de/.

## Aufbau (seit 23.09.2026)

- `index.html`: Startseite, gebaut mit dem Scrollcraft-Skill. Quelle, Briefing und Prüfberichte:
  `Marketing/Website/scrollcraft/builds/heimstart/` im MoveMaster-Arbeitsordner. Änderungen dort machen
  und hierher kopieren, damit beide Stände gleich bleiben.
- `datenschutz/`, `support/`, `konto-loeschen/`, `impressum/`, `404.html`: Pflichtseiten im Stil der
  Startseite. Die Adressen sind in App Store Connect und der Play Console hinterlegt und dürfen sich nicht ändern.
- `scrollcraft.css`, `scrollcraft.js`: Engine des Skills, unverändert.
- `assets/heimstart.*` (Startseite), `assets/pages.*` (Pflichtseiten), `assets/media/`, `assets/app/`
  (echte App-Aufnahmen), `assets/fonts/` (selbst gehostet), `assets/badges/` (offizielle Store-Badges).
- `assets/site.css` und `assets/icon.svg` stammen von der alten Fassung und werden nicht mehr verwendet.

## Stores freischalten

Solange eine App nicht öffentlich ist, sind Badges und "App laden" Platzhalter mit dem Hinweis
"bald erhältlich". Zum Start in `assets/stores.js` bei Apple bzw. Google `live: true` setzen.

## Datenschutz der Website

Keine Cookies, keine Nutzungsanalyse, keine Schriftarten oder Skripte von Dritten. Die Skripte
der Seite sind eigene Dateien; der Rechner rechnet nur im Browser und sendet nichts.

## Domain und Mail

Stand 17.09.2026: heimstart.de zeigt per DNS auf GitHub Pages (A-Eintrag, www als CNAME).
Der Mailweg ist verifiziert: MX, SPF, DKIM und DMARC stehen, Google Workspace nimmt
support@, info@, kontakt@ und datenschutz@heimstart.de an. Kontaktadresse der Seiten ist
support@heimstart.de. `CNAME` und `.nojekyll` nicht entfernen.

Die bisherige Website im Repository Daeniaell/movemaster-site bleibt für
installierte Appversionen unter move-master.de erreichbar.
