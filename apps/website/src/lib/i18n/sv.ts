/**
 * Swedish strings for the website.
 *
 * Keys mirror the semantic keys used by the iOS and Android apps
 * (route_*, prayers_type_*, time_format_*, hijri_calendar_offset_*).
 */
export const sv = {
	// Navigation
	route_home_name: 'Schema',
	route_compass_name: 'Kompass',
	route_settings_preferences: 'Inställningar',

	// Home
	route_home_title: 'Bönetider',
	prayers_type_fajr: 'Fajr',
	prayers_type_shuruk: 'Shuruk',
	prayers_type_dhohr: 'Dhohr',
	prayers_type_asr: 'Asr',
	prayers_type_maghrib: 'Maghrib',
	prayers_type_isha: 'Isha',
	route_home_error: 'Error: {message}',

	// Compass
	route_compass_north_abbreviation: 'N',
	route_compass_permission_message: 'Kompassen behöver åtkomst till telefonens sensorer',
	route_compass_permission_hint: 'Tryck på knappen och vrid sedan telefonen mot Qibla.',
	route_compass_enable: 'Aktivera kompass',
	route_compass_no_compass:
		'Ingen kompass hittades på den här enheten — öppna sidan på en mobiltelefon för live-riktning.',
	route_compass_qibla: 'Qibla {degrees}°',
	route_compass_rotate_hint: 'Vrid tills pilen pekar rakt upp',
	route_compass_location_approximate:
		'Ungefärlig riktning från {city}. Aktivera platstjänster för bättre noggrannhet.',

	// Settings — prayer times
	route_settings_section_methodology_details:
		'De böner-tider som visas i appen beräknas med hjälp av dessa inställningar.',
	route_settings_city: 'Stad',
	route_settings_method: 'Metod',
	prayers_method_islamiskaforbundet_details:
		'Denna app tillhandahåller exakta islamiska böner-tider som hämtas direkt från Islamiska Förbundets webbplats, som beräknar tider baserat på metoden som beskrivs här:',

	// Settings — corrections
	hijri_calendar_offset_label: 'Hijri-kalenderoffset',
	route_settings_hijri_calendar_offset_disabled: 'Av',
	hijri_calendar_offset_template: '{days} dagar',

	// Settings — about this website
	route_settings_about_title: 'Om den här webbplatsen',
	route_settings_about_details:
		'Appen är öppen källkod och gratis att använda under MIT-licensen, och uppmuntrar alla att bidra eller dela feedback för att hjälpa till att förbättra den. Du kan utforska källkoden eller bidra via dess GitHub-arkivet.',
	route_settings_open_github: 'Öppna GitHub-arkivet',
	route_settings_report_feedback: 'Rapportera fel och feedback',
	route_settings_privacy_notice:
		'Din integritet är viktig för oss! Genom att använda den här appen godkänner du vår Integritetspolicy — du är välkommen att läsa den.',
	route_settings_read_privacy: 'Öppna integritetspolicyn',

	// Settings — download the app
	route_settings_download_title: 'Ladda ner appen',
	route_settings_download_details:
		'Installera appen på din telefon för att få snabb åtkomst till böner-tider och meddelanden.',
	route_settings_download_app_store: 'Ladda ner på App Store',
	route_settings_download_google_play: 'Ladda ner på Google Play',
	route_settings_rate_app: 'Kom ihåg att betygsätta appen efter att ha provat den!',

	// Tracker — navigation
	route_tracker_name: 'Böner',
	route_tracker_title: 'Bönelogg',
	route_tracker_history: 'Historik',
	route_tracker_friends: 'Vänner',
	route_tracker_notifications: 'Aviseringar',

	// Tracker — today
	route_tracker_today: 'Idag',
	route_tracker_streak: 'dagar i rad',
	route_tracker_week_total: 'av {total} den här veckan',
	route_tracker_group_total: 'i grupp',
	route_tracker_mark_hint: 'Tryck på bönen när du har bett.',
	route_tracker_group_hint: 'Tryck på personerna om du bad tillsammans med någon.',
	route_tracker_group_label: 'Bad i grupp',
	route_tracker_prayed: 'Bedd',
	route_tracker_not_marked: 'Inte markerad',

	// Tracker — account
	route_tracker_sign_in: 'Logga in',
	route_tracker_sign_up: 'Skapa konto',
	route_tracker_sign_out: 'Logga ut',
	route_tracker_handle: 'Användarnamn',
	route_tracker_password: 'Lösenord',
	route_tracker_display_name: 'Namn',
	route_tracker_login_hint: 'Vännerna lägger till dig med ditt användarnamn.',
	route_tracker_no_account: 'Har du inget konto?',
	route_tracker_have_account: 'Har du redan ett konto?',
	route_tracker_auth_required: 'Logga in för att se din logg.',
	route_tracker_login_invalid: 'Fel användarnamn eller lösenord.',
	route_tracker_handle_taken: 'Användarnamnet är upptaget.',
	route_tracker_invalid_handle: 'Användarnamn: 3–20 tecken, a–z, 0–9 eller _.',
	route_tracker_invalid_password: 'Lösenordet måste vara minst 8 tecken.',
	route_tracker_invalid_display_name: 'Ange ett namn, högst 40 tecken.',
	route_tracker_generic_error: 'Något gick fel. Försök igen.',

	// Tracker — friends
	route_tracker_friends_empty: 'Inga vänner än. Lägg till någon du vill stötta.',
	route_tracker_add_friend: 'Lägg till vän',
	route_tracker_add_friend_hint: 'Ange din väns användarnamn, till exempel aisha_93.',
	route_tracker_add: 'Lägg till',
	route_tracker_requests: 'Förfrågningar',
	route_tracker_accept: 'Acceptera',
	route_tracker_decline: 'Avböj',
	route_tracker_pending: 'Väntar på svar',
	route_tracker_quiet: 'Har bett lite de senaste tre dagarna',
	route_tracker_history_today: 'Ringen markerar idag.',
	route_tracker_steady: 'Ber stadigt',
	route_tracker_support: 'Stötta',
	route_tracker_nudge_sent: 'Påminnelse skickad',
	route_tracker_remove_friend: 'Ta bort vän',
	route_tracker_week_label: 'den här veckan',
	route_tracker_user_not_found: 'Ingen användare med det namnet.',

	// Tracker — history
	route_tracker_history_week: 'den här veckan',
	route_tracker_history_month: 'den här månaden',
	route_tracker_history_full_days: 'dagar med alla fem',
	route_tracker_history_group: 'böner i grupp',
	route_tracker_history_legend: 'Färgen visar hur många av dagens fem böner du markerade.',

	// Tracker — notifications
	route_tracker_notifications_empty: 'Inga aviseringar än.',
	route_tracker_mark_read: 'Markera alla som lästa',
	route_tracker_notification_quiet: '{name} har bett lite de senaste tre dagarna.',
	route_tracker_notification_nudge: '{name} skickade en påminnelse',
	route_tracker_notification_request: '{name} vill vara din vän.',
	route_tracker_notification_accepted: '{name} accepterade din förfrågan.',

	// Tracker — nudges
	route_tracker_nudge_default: 'Jag tänker på dig. Hur går det med bönerna?',
	route_tracker_nudge_one: 'Jag ber för dig. Vi tar nästa bön tillsammans.',
	route_tracker_nudge_two: 'Kom igen — en bön i taget.'
} as const;
