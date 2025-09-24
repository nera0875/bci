'use client';

import React, { useState } from 'react';
import * as Icons from 'lucide-react';
import { compartmentsConfig } from '@/lib/config/compartments.config';

// Liste des icônes populaires
const availableIcons = [
  'Shield', 'AlertCircle', 'Target', 'Lightbulb', 'Zap',
  'Star', 'Heart', 'Lock', 'Key', 'Database', 'Cloud',
  'Code', 'Terminal', 'Cpu', 'HardDrive', 'Wifi',
  'Globe', 'Map', 'Compass', 'Flag', 'Pin',
  'Folder', 'File', 'Archive', 'Package', 'Box',
  'User', 'Users', 'Eye', 'EyeOff', 'Search',
  'Settings', 'Tool', 'Wrench', 'Hammer', 'Cog'
];

const availableColors = [
  { name: 'Green', value: 'text-green-500' },
  { name: 'Red', value: 'text-red-500' },
  { name: 'Blue', value: 'text-blue-500' },
  { name: 'Yellow', value: 'text-yellow-500' },
  { name: 'Purple', value: 'text-purple-500' },
  { name: 'Orange', value: 'text-orange-500' },
  { name: 'Pink', value: 'text-pink-500' },
  { name: 'Indigo', value: 'text-indigo-500' },
  { name: 'Gray', value: 'text-gray-500' },
  { name: 'Cyan', value: 'text-cyan-500' }
];

export default function CompartmentSettings() {
  const [compartments, setCompartments] = useState(compartmentsConfig);
  const [showInstructions, setShowInstructions] = useState(false);

  const updateCompartment = (index: number, field: string, value: string) => {
    const newCompartments = [...compartments];
    newCompartments[index] = { ...newCompartments[index], [field]: value };
    setCompartments(newCompartments);
  };

  const addCompartment = () => {
    const newCompartment = {
      id: `custom_${Date.now()}`,
      name: 'New Compartment',
      icon: 'Folder',
      color: 'text-gray-500',
      description: 'Custom compartment'
    };
    setCompartments([...compartments, newCompartment]);
  };

  const removeCompartment = (index: number) => {
    setCompartments(compartments.filter((_, i) => i !== index));
  };

  const saveChanges = () => {
    // Afficher les instructions pour sauvegarder
    setShowInstructions(true);
  };

  const getIcon = (iconName: string) => {
    const IconComponent = Icons[iconName as keyof typeof Icons] as any;
    return IconComponent || Icons.Folder;
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h2 className="text-2xl font-bold mb-6">Compartment Settings</h2>

      <div className="space-y-4 mb-6">
        {compartments.map((comp, index) => {
          const Icon = getIcon(comp.icon);
          return (
            <div key={comp.id} className="bg-white border border-gray-200 rounded-lg p-4">
              <div className="flex items-center gap-4">
                <Icon className={`w-6 h-6 ${comp.color}`} />

                <div className="flex-1 grid grid-cols-4 gap-4">
                  {/* Name */}
                  <input
                    type="text"
                    value={comp.name}
                    onChange={(e) => updateCompartment(index, 'name', e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded"
                    placeholder="Name"
                  />

                  {/* Icon */}
                  <select
                    value={comp.icon}
                    onChange={(e) => updateCompartment(index, 'icon', e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded"
                  >
                    {availableIcons.map(icon => (
                      <option key={icon} value={icon}>{icon}</option>
                    ))}
                  </select>

                  {/* Color */}
                  <select
                    value={comp.color}
                    onChange={(e) => updateCompartment(index, 'color', e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded"
                  >
                    {availableColors.map(color => (
                      <option key={color.value} value={color.value}>{color.name}</option>
                    ))}
                  </select>

                  {/* Delete Button */}
                  <button
                    onClick={() => removeCompartment(index)}
                    className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition"
                  >
                    Remove
                  </button>
                </div>
              </div>

              {/* Description */}
              <input
                type="text"
                value={comp.description}
                onChange={(e) => updateCompartment(index, 'description', e.target.value)}
                className="w-full mt-3 px-3 py-2 border border-gray-300 rounded"
                placeholder="Description"
              />
            </div>
          );
        })}
      </div>

      <div className="flex gap-4">
        <button
          onClick={addCompartment}
          className="px-6 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition"
        >
          Add Compartment
        </button>

        <button
          onClick={saveChanges}
          className="px-6 py-2 bg-green-500 text-white rounded hover:bg-green-600 transition"
        >
          Generate Config
        </button>
      </div>

      {showInstructions && (
        <div className="mt-6 p-4 bg-gray-100 rounded">
          <h3 className="font-bold mb-2">To save your changes:</h3>
          <p className="mb-2">Copy this configuration to <code className="bg-gray-200 px-2 py-1 rounded">/lib/config/compartments.config.ts</code>:</p>
          <pre className="bg-gray-800 text-white p-4 rounded overflow-x-auto">
            <code>
{`export const compartmentsConfig = ${JSON.stringify(compartments, null, 2)};`}
            </code>
          </pre>
        </div>
      )}
    </div>
  );
}