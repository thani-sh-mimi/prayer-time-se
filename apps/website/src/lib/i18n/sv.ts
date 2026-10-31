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

	// Journal — personal prayer tracking, stored on the device
	route_journal_name: 'Böner',
	route_journal_title: 'Bönelogg',
	route_journal_today: 'Idag',
	route_journal_streak: 'dagar i rad',
	route_journal_week: 'av {total} den här veckan',
	route_journal_hint: 'Tryck på bönen när du har bett. Allt sparas bara på den här enheten.',
	route_journal_local: 'Sparas bara på den här enheten.',
	route_journal_history_hint: 'Färgen visar hur många av dagens fem böner du markerade.',
	route_journal_clear: 'Rensa',
	route_journal_clear_confirm: 'Rensa hela loggen? Det går inte att ångra.',
	route_journal_previous_month: 'Föregående månad',
	route_journal_next_month: 'Nästa månad'
} as const;
