/**
 * Configuration des compartiments Mem0
 * MODIFIABLE : Vous pouvez changer les icônes, couleurs et ajouter des compartiments ici
 */

export const compartmentsConfig = [
  {
    id: 'success_exploits',
    name: 'Successful Exploits',
    icon: 'Shield', // Changez l'icône ici
    color: 'text-green-500', // Changez la couleur ici
    description: 'Validated exploits with payloads'
  },
  {
    id: 'failed_attempts',
    name: 'Failed Attempts',
    icon: 'AlertCircle',
    color: 'text-red-500',
    description: 'Blocked attempts analysis'
  },
  {
    id: 'reconnaissance',
    name: 'Reconnaissance',
    icon: 'Target',
    color: 'text-blue-500',
    description: 'Ports, services, technologies'
  },
  {
    id: 'active_plans',
    name: 'Active Plans',
    icon: 'Lightbulb',
    color: 'text-yellow-500',
    description: 'Attack plans and next steps'
  },
  {
    id: 'patterns',
    name: 'Patterns',
    icon: 'Zap',
    color: 'text-purple-500',
    description: 'Reusable techniques'
  },
  // AJOUTEZ VOS PROPRES COMPARTIMENTS ICI :
  // {
  //   id: 'custom_compartment',
  //   name: 'Mon Compartiment',
  //   icon: 'Star',
  //   color: 'text-orange-500',
  //   description: 'Description personnalisée'
  // }
];

// Icônes disponibles de Lucide React :
// Shield, AlertCircle, Target, Lightbulb, Zap,
// Star, Heart, Lock, Key, Database, Cloud,
// Code, Terminal, Cpu, HardDrive, Wifi,
// Globe, Map, Compass, Flag, Pin, etc.