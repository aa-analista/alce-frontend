import {
  // Comunicación
  MessageSquare, MessageCircle, Mail, Phone, Send, Bell, BellRing, Megaphone, Headphones,
  // IA / Magia
  Sparkles, Wand2, Bot, Brain, Cpu, Zap, Rocket, Atom, Flame,
  // Datos / Documentos
  Database, FileText, FileSignature, Folder, FolderOpen, Archive, BookOpen, Library,
  ClipboardList, Notebook, Files, FileCode, FileSpreadsheet,
  // Gráficas / Analytics
  BarChart3, LineChart, PieChart, TrendingUp, Activity, Gauge,
  // Tiempo
  Calendar, CalendarCheck, CalendarDays, Clock, History, Timer,
  // Personas
  Users, User, UserPlus, UserCheck, Contact,
  // Negocio / Dinero
  DollarSign, CreditCard, ShoppingCart, Briefcase, Building2, Receipt, Banknote,
  // Diseño
  Palette, Image, Camera, Pencil, Paintbrush, Sticker, Layers,
  // Herramientas
  Wrench, Settings, Cog, Hammer, Code, Terminal, Workflow, Boxes,
  // Misc útiles
  Heart, Star, Shield, Flag, Trophy, Lightbulb, Target, Compass, Map, Globe,
  Lock, Eye, Search, Filter, Tag, Bookmark, Link as LinkIcon, Share2,
} from 'lucide-react'

// Curated catalog of lucide icons for agents. Keys are stored in the DB
// (column `icon`), values are the React components rendered in the UI.
// Anything that isn't a key here falls back to being treated as an emoji string.
export const ICON_CATALOG = {
  MessageSquare, MessageCircle, Mail, Phone, Send, Bell, BellRing, Megaphone, Headphones,
  Sparkles, Wand2, Bot, Brain, Cpu, Zap, Rocket, Atom, Flame,
  Database, FileText, FileSignature, Folder, FolderOpen, Archive, BookOpen, Library,
  ClipboardList, Notebook, Files, FileCode, FileSpreadsheet,
  BarChart3, LineChart, PieChart, TrendingUp, Activity, Gauge,
  Calendar, CalendarCheck, CalendarDays, Clock, History, Timer,
  Users, User, UserPlus, UserCheck, Contact,
  DollarSign, CreditCard, ShoppingCart, Briefcase, Building2, Receipt, Banknote,
  Palette, Image, Camera, Pencil, Paintbrush, Sticker, Layers,
  Wrench, Settings, Cog, Hammer, Code, Terminal, Workflow, Boxes,
  Heart, Star, Shield, Flag, Trophy, Lightbulb, Target, Compass, Map, Globe,
  Lock, Eye, Search, Filter, Tag, Bookmark, Link: LinkIcon, Share2,
}

export const ICON_NAMES = Object.keys(ICON_CATALOG)

// Resolve an icon value to a React component, or null if it's an emoji/empty.
export function resolveIcon(value) {
  if (value && ICON_CATALOG[value]) return ICON_CATALOG[value]
  return null
}

// Render an icon: lucide component if recognized, otherwise the raw string as emoji.
// `className` is applied to the lucide SVG; emojis get an inline font-size hint.
export function renderAgentIcon(value, { className = 'w-4 h-4', emojiClassName = '' } = {}) {
  const Icon = resolveIcon(value)
  if (Icon) return <Icon className={className} />
  return <span className={emojiClassName}>{value || '🤖'}</span>
}
