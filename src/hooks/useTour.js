import { driver } from 'driver.js'
import 'driver.js/dist/driver.css'

export function startAppTour() {
  const driverObj = driver({
    showProgress: true,
    animate: true,
    smoothScroll: true,
    stagePadding: 8,
    stageRadius: 12,
    overlayColor: 'rgba(0, 0, 0, 0.6)',
    nextBtnText: 'Siguiente',
    prevBtnText: 'Anterior',
    doneBtnText: 'Finalizar',
    progressText: '{{current}} de {{total}}',
    popoverClass: 'alce-tour-popover',
    steps: [
      // 1. Welcome
      {
        popover: {
          title: 'Bienvenido a Alce AI',
          description: 'Le daremos un recorrido rapido por la plataforma para que conozca todas las herramientas disponibles. Solo tomara un par de minutos.',
          side: 'over',
          align: 'center',
        }
      },
      // 2. Sidebar - Inicio
      {
        element: '#nav-home',
        popover: {
          title: 'Inicio',
          description: 'Su panel principal. Aqui vera el resumen de su workspace: KPIs, checklist de configuracion, y acceso rapido a todas las herramientas.',
          side: 'right',
          align: 'start',
        }
      },
      // 3. Coach AI
      {
        element: '#nav-coach-ai',
        popover: {
          title: 'Coach AI',
          description: 'Su asistente estrategico con inteligencia artificial. Haga preguntas sobre su operacion, equipo o modulos y obtenga respuestas inteligentes en tiempo real.',
          side: 'right',
          align: 'start',
        }
      },
      // 4. Operacion
      {
        element: '#nav-operacion',
        popover: {
          title: 'Operacion',
          description: 'Panel de operaciones donde podra dar seguimiento a tareas, proyectos y flujos de trabajo de su equipo.',
          side: 'right',
          align: 'start',
        }
      },
      // 5. Equipo
      {
        element: '#nav-usuarios',
        popover: {
          title: 'Equipo',
          description: 'Gestione los miembros de su organizacion. Invite colaboradores, asigne roles y controle que modulos puede usar cada persona.',
          side: 'right',
          align: 'start',
        }
      },
      // 6. Modulos
      {
        element: '#nav-marketplace',
        popover: {
          title: 'Modulos',
          description: 'El marketplace de Alce AI. Active modulos de automatizacion, conecte servicios de Google (Drive, Gmail, Calendar) y personalice su workspace.',
          side: 'right',
          align: 'start',
        }
      },
      // 7. Actividad
      {
        element: '#nav-actividad',
        popover: {
          title: 'Actividad',
          description: 'Historial de actividad de su workspace. Vea todo lo que sucede en su organizacion en un solo lugar.',
          side: 'right',
          align: 'start',
        }
      },
      // 8. Search bar
      {
        element: '#tour-search',
        popover: {
          title: 'Busqueda Global',
          description: 'Busque rapidamente cualquier cosa en su workspace: miembros del equipo, modulos, configuraciones y mas.',
          side: 'bottom',
          align: 'center',
        }
      },
      // 9. Notifications
      {
        element: '#tour-notifications',
        popover: {
          title: 'Notificaciones',
          description: 'Aqui recibira alertas importantes: nuevos miembros, actualizaciones de modulos, recordatorios y mensajes de su equipo.',
          side: 'bottom',
          align: 'end',
        }
      },
      // 10. Status banner
      {
        element: '#tour-status',
        popover: {
          title: 'Estado del Workspace',
          description: 'Este banner le muestra el estado actual de su entorno. Cuando todo este configurado correctamente, vera esta confirmacion.',
          side: 'bottom',
          align: 'start',
        }
      },
      // 11. KPIs
      {
        element: '#tour-kpis',
        popover: {
          title: 'Metricas Clave',
          description: 'Sus KPIs operativos de un vistazo: tareas abiertas, bloqueos, miembros del equipo, modulos activos y actividad reciente.',
          side: 'bottom',
          align: 'center',
        }
      },
      // 12. Checklist
      {
        element: '#tour-checklist',
        popover: {
          title: 'Primeros Pasos',
          description: 'Su checklist de configuracion inicial. Complete cada paso para aprovechar al maximo la plataforma. Haga click en cualquier paso para ir directamente.',
          side: 'right',
          align: 'start',
        }
      },
      // 13. Coach AI card
      {
        element: '#tour-coach',
        popover: {
          title: 'Acceso Rapido al Coach AI',
          description: 'Desde aqui puede abrir su asistente estrategico directamente. El Coach AI aprende del contexto de su workspace para dar mejores respuestas.',
          side: 'left',
          align: 'start',
        }
      },
      // 14. Finish
      {
        element: '#tour-guide',
        popover: {
          title: 'Listo para comenzar!',
          description: 'Ya conoce las herramientas principales de Alce AI. Puede repetir este recorrido en cualquier momento haciendo click aqui. Le recomendamos comenzar invitando a su equipo.',
          side: 'top',
          align: 'start',
        }
      },
    ]
  })

  driverObj.drive()
}
