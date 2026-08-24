import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// Translation resources
const resources = {
  en: {
    translation: {
      // Navigation
      nav: {
        dashboard: "Dashboard",
        schedules: "Schedules",
        faculty: "Faculty",
        students: "Students",
        subjects: "Subjects",
        rooms: "Rooms",
        classSpaces: "Class Spaces",
        aiInsights: "AI Insights",
        settings: "Settings",
        profile: "My Profile",
        logout: "Logout"
      },
      // Dashboard
      dashboard: {
        title: "Dashboard",
        welcome: "Welcome back",
        overview: "System Overview",
        totalStudents: "Total Students",
        totalFaculty: "Total Faculty",
        activeSchedules: "Active Schedules",
        totalSubjects: "Total Subjects",
        programAnalytics: "Program Analytics",
        studentsByYear: "Students by Year Level",
        studentsBySemester: "Students by Semester",
        quickActions: "Quick Actions",
        viewStudents: "View All Students",
        manageSchedules: "Manage Schedules",
        yearLevel: "Year {{level}}",
        semester: "Semester {{sem}}",
        noData: "No student data available for this program yet."
      },
      // Settings
      settings: {
        title: "Settings",
        subtitle: "Manage your account preferences and security",
        security: "Security",
        notifications: "Notifications",
        appearance: "Appearance",
        privacy: "Privacy",
        accountActive: "Account Active",
        accountVerified: "Your account is verified and in good standing",
        // Security Tab
        securitySettings: "Security Settings",
        securitySubtitle: "Manage your password and account security",
        changePassword: "Change Password",
        currentPassword: "Current Password",
        newPassword: "New Password",
        confirmPassword: "Confirm New Password",
        updatePassword: "Update Password",
        updating: "Updating...",
        passwordTips: "Password Security Tips",
        tip1: "Use at least 8 characters",
        tip2: "Include uppercase and lowercase letters",
        tip3: "Add numbers and special characters",
        tip4: "Avoid common words and phrases",
        tip5: "Change your password regularly",
        // Notifications Tab
        notificationPreferences: "Notification Preferences",
        notificationSubtitle: "Choose what notifications you want to receive",
        emailNotifications: "Email Notifications",
        emailNotificationsDesc: "Receive updates via email",
        scheduleUpdates: "Schedule Updates",
        scheduleUpdatesDesc: "Notify when schedules change",
        facultyAssignments: "Faculty Assignments",
        facultyAssignmentsDesc: "Alerts for new assignments",
        systemAlerts: "System Alerts",
        systemAlertsDesc: "Important system notifications",
        weeklyDigest: "Weekly Digest",
        weeklyDigestDesc: "Summary of weekly activity",
        savePreferences: "Save Preferences",
        saving: "Saving...",
        // Appearance Tab
        appearanceSettings: "Appearance Settings",
        appearanceSubtitle: "Customize how the system looks for you",
        theme: "Theme",
        light: "Light",
        dark: "Dark",
        system: "System",
        language: "Language",
        timezone: "Timezone",
        saveAppearance: "Save Appearance",
        // Privacy Tab
        privacySettings: "Privacy Settings",
        privacySubtitle: "Control who can see your information",
        profileVisibility: "Profile Visibility",
        publicProfile: "Public - Anyone can view",
        programOnly: "Program Only - Only your program members",
        privateProfile: "Private - Only you",
        contactInformation: "Contact Information",
        showEmail: "Show Email Address",
        showEmailDesc: "Allow others to see your email",
        showPhone: "Show Phone Number",
        showPhoneDesc: "Allow others to see your phone",
        allowMessages: "Allow Messages",
        allowMessagesDesc: "Let others send you messages",
        savePrivacy: "Save Privacy Settings"
      },
      // Common
      common: {
        save: "Save",
        cancel: "Cancel",
        delete: "Delete",
        edit: "Edit",
        add: "Add",
        search: "Search",
        filter: "Filter",
        loading: "Loading...",
        noData: "No data available",
        success: "Success",
        error: "Error",
        confirm: "Confirm"
      }
    }
  },
  fil: {
    translation: {
      // Navigation
      nav: {
        dashboard: "Dashboard",
        schedules: "Mga Iskedyul",
        faculty: "Mga Guro",
        students: "Mga Estudyante",
        subjects: "Mga Asignatura",
        rooms: "Mga Silid",
        classSpaces: "Mga Espasyo ng Klase",
        aiInsights: "AI Insights",
        settings: "Mga Setting",
        profile: "Aking Profile",
        logout: "Mag-logout"
      },
      // Dashboard
      dashboard: {
        title: "Dashboard",
        welcome: "Maligayang pagbabalik",
        overview: "Pangkalahatang Tingin",
        totalStudents: "Kabuuang Estudyante",
        totalFaculty: "Kabuuang Guro",
        activeSchedules: "Aktibong Iskedyul",
        totalSubjects: "Kabuuang Asignatura",
        programAnalytics: "Pagsusuri ng Programa",
        studentsByYear: "Estudyante ayon sa Taon",
        studentsBySemester: "Estudyante ayon sa Semestre",
        quickActions: "Mabilis na Aksyon",
        viewStudents: "Tingnan ang Lahat ng Estudyante",
        manageSchedules: "Pamahalaan ang Iskedyul",
        yearLevel: "Ika-{{level}} Taon",
        semester: "{{sem}} Semestre",
        noData: "Walang available na datos ng estudyante para sa programang ito."
      },
      // Settings
      settings: {
        title: "Mga Setting",
        subtitle: "Pamahalaan ang iyong account at seguridad",
        security: "Seguridad",
        notifications: "Mga Abiso",
        appearance: "Hitsura",
        privacy: "Privacy",
        accountActive: "Aktibong Account",
        accountVerified: "Ang iyong account ay verified at mabuti ang kalagayan",
        // Security Tab
        securitySettings: "Mga Setting ng Seguridad",
        securitySubtitle: "Pamahalaan ang iyong password at seguridad",
        changePassword: "Baguhin ang Password",
        currentPassword: "Kasalukuyang Password",
        newPassword: "Bagong Password",
        confirmPassword: "Kumpirmahin ang Bagong Password",
        updatePassword: "I-update ang Password",
        updating: "Nag-uupdate...",
        passwordTips: "Mga Tip sa Seguridad ng Password",
        tip1: "Gumamit ng kahit 8 karakter",
        tip2: "Isama ang malalaki at maliliit na titik",
        tip3: "Magdagdag ng numero at special characters",
        tip4: "Iwasan ang karaniwang salita",
        tip5: "Palitan ang password nang regular",
        // Notifications Tab
        notificationPreferences: "Mga Kagustuhan sa Abiso",
        notificationSubtitle: "Piliin kung anong abiso ang gusto mong matanggap",
        emailNotifications: "Email Notifications",
        emailNotificationsDesc: "Tumanggap ng updates sa email",
        scheduleUpdates: "Updates sa Iskedyul",
        scheduleUpdatesDesc: "Abiso kapag nagbago ang iskedyul",
        facultyAssignments: "Mga Assignment ng Guro",
        facultyAssignmentsDesc: "Alerto para sa bagong assignment",
        systemAlerts: "Mga Alerto ng Sistema",
        systemAlertsDesc: "Mahahalagang abiso ng sistema",
        weeklyDigest: "Lingguhang Buod",
        weeklyDigestDesc: "Buod ng aktibidad sa isang linggo",
        savePreferences: "I-save ang Kagustuhan",
        saving: "Nag-sesave...",
        // Appearance Tab
        appearanceSettings: "Mga Setting ng Hitsura",
        appearanceSubtitle: "I-customize kung paano mukhang ang sistema",
        theme: "Tema",
        light: "Maliwanag",
        dark: "Madilim",
        system: "Sistema",
        language: "Wika",
        timezone: "Timezone",
        saveAppearance: "I-save ang Hitsura",
        // Privacy Tab
        privacySettings: "Mga Setting ng Privacy",
        privacySubtitle: "Kontrolin kung sino ang makakakita ng impormasyon mo",
        profileVisibility: "Visibility ng Profile",
        publicProfile: "Pampubliko - Makikita ng lahat",
        programOnly: "Programa Lang - Miyembro ng programa mo lang",
        privateProfile: "Pribado - Ikaw lang",
        contactInformation: "Impormasyon sa Pakikipag-ugnayan",
        showEmail: "Ipakita ang Email Address",
        showEmailDesc: "Payagan ang iba na makita ang email mo",
        showPhone: "Ipakita ang Numero ng Telepono",
        showPhoneDesc: "Payagan ang iba na makita ang telepono mo",
        allowMessages: "Payagan ang Mensahe",
        allowMessagesDesc: "Payagan ang iba na magpadala ng mensahe",
        savePrivacy: "I-save ang Privacy Settings"
      },
      // Common
      common: {
        save: "I-save",
        cancel: "Kanselahin",
        delete: "Tanggalin",
        edit: "I-edit",
        add: "Magdagdag",
        search: "Maghanap",
        filter: "I-filter",
        loading: "Naglo-load...",
        noData: "Walang available na datos",
        success: "Tagumpay",
        error: "Error",
        confirm: "Kumpirmahin"
      }
    }
  },
  ceb: {
    translation: {
      // Navigation
      nav: {
        dashboard: "Dashboard",
        schedules: "Mga Iskedyul",
        faculty: "Mga Magtutudlo",
        students: "Mga Estudyante",
        subjects: "Mga Subject",
        rooms: "Mga Kwarto",
        classSpaces: "Mga Espasyo sa Klase",
        aiInsights: "AI Insights",
        settings: "Mga Setting",
        profile: "Akong Profile",
        logout: "Logout"
      },
      // Dashboard
      dashboard: {
        title: "Dashboard",
        welcome: "Maayong pagbalik",
        overview: "Kinatibuk-ang Pagtan-aw",
        totalStudents: "Kinatibuk-ang Estudyante",
        totalFaculty: "Kinatibuk-ang Magtutudlo",
        activeSchedules: "Aktibong Iskedyul",
        totalSubjects: "Kinatibuk-ang Subject",
        programAnalytics: "Pagsusi sa Programa",
        studentsByYear: "Estudyante sumala sa Tuig",
        studentsBySemester: "Estudyante sumala sa Semestre",
        quickActions: "Paspas nga Aksyon",
        viewStudents: "Tan-awa ang Tanang Estudyante",
        manageSchedules: "Pagdumala sa Iskedyul",
        yearLevel: "Ika-{{level}} Tuig",
        semester: "{{sem}} Semestre",
        noData: "Walay datos sa estudyante para sa programa."
      },
      // Settings
      settings: {
        title: "Mga Setting",
        subtitle: "Pagdumala sa imong account ug seguridad",
        security: "Seguridad",
        notifications: "Mga Pahibalo",
        appearance: "Panagway",
        privacy: "Privacy",
        accountActive: "Aktibo ang Account",
        accountVerified: "Ang imong account verified ug maayo ang kahimtang",
        // Security Tab
        securitySettings: "Mga Setting sa Seguridad",
        securitySubtitle: "Pagdumala sa imong password ug seguridad",
        changePassword: "Usba ang Password",
        currentPassword: "Kasamtangang Password",
        newPassword: "Bag-ong Password",
        confirmPassword: "Kompirma ang Bag-ong Password",
        updatePassword: "I-update ang Password",
        updating: "Nag-update...",
        passwordTips: "Mga Tip sa Seguridad sa Password",
        tip1: "Gamita ug 8 ka karakter o labaw pa",
        tip2: "Ilakip ang dagko ug gamay nga letra",
        tip3: "Idugang ug numero ug special characters",
        tip4: "Likayi ang kasagaran nga pulong",
        tip5: "Usba ang password kanunay",
        // Notifications Tab
        notificationPreferences: "Mga Gusto sa Pahibalo",
        notificationSubtitle: "Pilia unsang pahibalo ang gusto nimong madawat",
        emailNotifications: "Email Notifications",
        emailNotificationsDesc: "Dawata ang updates sa email",
        scheduleUpdates: "Updates sa Iskedyul",
        scheduleUpdatesDesc: "Pahibalo kon mausab ang iskedyul",
        facultyAssignments: "Mga Assignment sa Magtutudlo",
        facultyAssignmentsDesc: "Alerto para sa bag-ong assignment",
        systemAlerts: "Mga Alerto sa Sistema",
        systemAlertsDesc: "Importante nga pahibalo sa sistema",
        weeklyDigest: "Weekly Digest",
        weeklyDigestDesc: "Summary sa aktibidad sa usa ka semana",
        savePreferences: "I-save ang Gusto",
        saving: "Nag-save...",
        // Appearance Tab
        appearanceSettings: "Mga Setting sa Panagway",
        appearanceSubtitle: "I-customize kon unsaon pagtan-aw ang sistema",
        theme: "Tema",
        light: "Hayag",
        dark: "Ngitngit",
        system: "Sistema",
        language: "Pinulongan",
        timezone: "Timezone",
        saveAppearance: "I-save ang Panagway",
        // Privacy Tab
        privacySettings: "Mga Setting sa Privacy",
        privacySubtitle: "Kontrola kon kinsa makakita sa imong impormasyon",
        profileVisibility: "Visibility sa Profile",
        publicProfile: "Publiko - Makita sa tanan",
        programOnly: "Programa Lang - Mga miyembro sa programa lang",
        privateProfile: "Pribado - Ikaw lang",
        contactInformation: "Impormasyon sa Kontak",
        showEmail: "Ipakita ang Email Address",
        showEmailDesc: "Tugoti ang uban nga makita ang imong email",
        showPhone: "Ipakita ang Numero sa Telepono",
        showPhoneDesc: "Tugoti ang uban nga makita ang imong telepono",
        allowMessages: "Tugoti ang Mensahe",
        allowMessagesDesc: "Tugoti ang uban nga magpadala ug mensahe",
        savePrivacy: "I-save ang Privacy Settings"
      },
      // Common
      common: {
        save: "I-save",
        cancel: "Kanselahon",
        delete: "Tangtangon",
        edit: "I-edit",
        add: "Idugang",
        search: "Pangitaa",
        filter: "I-filter",
        loading: "Nag-load...",
        noData: "Walay datos",
        success: "Malampuson",
        error: "Error",
        confirm: "Kompirma"
      }
    }
  }
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'en',
    debug: false,
    interpolation: {
      escapeValue: false
    }
  });

export default i18n;
