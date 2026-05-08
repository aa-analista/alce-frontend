// Códigos de marcación (ladas) ordenados con LATAM + España + USA primero
export const DIAL_CODES = [
  { code: '+52',  flag: '🇲🇽', name: 'Mexico' },
  { code: '+57',  flag: '🇨🇴', name: 'Colombia' },
  { code: '+54',  flag: '🇦🇷', name: 'Argentina' },
  { code: '+56',  flag: '🇨🇱', name: 'Chile' },
  { code: '+51',  flag: '🇵🇪', name: 'Peru' },
  { code: '+593', flag: '🇪🇨', name: 'Ecuador' },
  { code: '+58',  flag: '🇻🇪', name: 'Venezuela' },
  { code: '+502', flag: '🇬🇹', name: 'Guatemala' },
  { code: '+53',  flag: '🇨🇺', name: 'Cuba' },
  { code: '+591', flag: '🇧🇴', name: 'Bolivia' },
  { code: '+1',   flag: '🇩🇴', name: 'Republica Dominicana' },
  { code: '+504', flag: '🇭🇳', name: 'Honduras' },
  { code: '+595', flag: '🇵🇾', name: 'Paraguay' },
  { code: '+503', flag: '🇸🇻', name: 'El Salvador' },
  { code: '+505', flag: '🇳🇮', name: 'Nicaragua' },
  { code: '+506', flag: '🇨🇷', name: 'Costa Rica' },
  { code: '+507', flag: '🇵🇦', name: 'Panama' },
  { code: '+598', flag: '🇺🇾', name: 'Uruguay' },
  { code: '+34',  flag: '🇪🇸', name: 'Espana' },
  { code: '+1',   flag: '🇺🇸', name: 'Estados Unidos' },
  { code: '+55',  flag: '🇧🇷', name: 'Brasil' },
]

export const COUNTRY_TO_DIAL = DIAL_CODES.reduce((acc, c) => {
  if (!acc[c.name]) acc[c.name] = c.code
  return acc
}, {})
