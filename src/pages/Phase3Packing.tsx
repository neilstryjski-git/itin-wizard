import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Backpack, RefreshCw, Share2, Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useProjectsContext } from '@/contexts/ProjectsContext';
import { PackingItem } from '@/types/project';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

const BASE_PACKING: { name: string; category: string }[] = [
  { name: 'Passport', category: 'Documents' },
  { name: 'Travel Insurance Docs', category: 'Documents' },
  { name: 'Phone Charger', category: 'Electronics' },
  { name: 'Power Adapter', category: 'Electronics' },
  { name: 'Toiletries Kit', category: 'Personal Care' },
  { name: 'Sunscreen', category: 'Personal Care' },
  { name: 'Medications', category: 'Health' },
  { name: 'First Aid Kit', category: 'Health' },
  { name: 'T-shirts', category: 'Clothing' },
  { name: 'Shorts/Pants', category: 'Clothing' },
  { name: 'Underwear', category: 'Clothing' },
  { name: 'Sleepwear', category: 'Clothing' },
  { name: 'Comfortable Walking Shoes', category: 'Clothing' },
  { name: 'Sunglasses', category: 'Accessories' },
  { name: 'Hat/Cap', category: 'Accessories' },
  { name: 'Day Backpack', category: 'Accessories' },
  { name: 'Reusable Water Bottle', category: 'Accessories' },
];

const ACTIVITY_GEAR: Record<string, { name: string; category: string }[]> = {
  cave: [
    { name: 'Headlamp', category: 'Adventure Gear' },
    { name: 'Sturdy Hiking Shoes', category: 'Adventure Gear' },
    { name: 'Long Socks', category: 'Adventure Gear' },
  ],
  hike: [
    { name: 'Hiking Boots', category: 'Adventure Gear' },
    { name: 'Moisture-wicking Socks', category: 'Adventure Gear' },
    { name: 'Rain Jacket', category: 'Adventure Gear' },
    { name: 'Hiking Backpack', category: 'Adventure Gear' },
  ],
  snorkel: [
    { name: 'Water Shoes', category: 'Water Gear' },
    { name: 'Reef-safe Sunscreen', category: 'Water Gear' },
    { name: 'Dry Bag', category: 'Water Gear' },
    { name: 'Rash Guard', category: 'Water Gear' },
  ],
  dive: [
    { name: 'Dive Certification Card', category: 'Water Gear' },
    { name: 'Underwater Camera', category: 'Water Gear' },
  ],
  beach: [
    { name: 'Swimsuit', category: 'Clothing' },
    { name: 'Beach Towel', category: 'Accessories' },
    { name: 'Flip Flops', category: 'Clothing' },
  ],
};

export default function Phase3Packing() {
  const { projectId } = useParams<{ projectId: string }>();
  const { getProject, updateProject } = useProjectsContext();
  const navigate = useNavigate();
  const project = getProject(projectId!);
  const [newItem, setNewItem] = useState('');
  const [newCategory, setNewCategory] = useState('Misc');

  if (!project) { navigate('/'); return null; }

  const items = project.phase_3_packing.items;
  const events = project.phase_2_itinerary.events;

  const generateList = () => {
    const packingItems: PackingItem[] = BASE_PACKING.map(p => ({
      id: crypto.randomUUID(),
      ...p,
      checked: false,
    }));

    // Check itinerary for activity keywords
    const allText = events.map(e => `${e.title} ${e.notes || ''}`).join(' ').toLowerCase();
    const addedNames = new Set(packingItems.map(p => p.name));

    for (const [keyword, gear] of Object.entries(ACTIVITY_GEAR)) {
      if (allText.includes(keyword)) {
        for (const g of gear) {
          if (!addedNames.has(g.name)) {
            packingItems.push({
              id: crypto.randomUUID(),
              ...g,
              checked: false,
              autoAdded: true,
            });
            addedNames.add(g.name);
          }
        }
      }
    }

    updateProject(projectId!, p => ({
      ...p,
      phase_3_packing: { items: packingItems, generated: true },
    }));
  };

  const toggleItem = (itemId: string) => {
    updateProject(projectId!, p => ({
      ...p,
      phase_3_packing: {
        ...p.phase_3_packing,
        items: p.phase_3_packing.items.map(i =>
          i.id === itemId ? { ...i, checked: !i.checked } : i
        ),
      },
    }));
  };

  const addItem = () => {
    if (!newItem.trim()) return;
    updateProject(projectId!, p => ({
      ...p,
      phase_3_packing: {
        ...p.phase_3_packing,
        items: [...p.phase_3_packing.items, {
          id: crypto.randomUUID(),
          name: newItem.trim(),
          category: newCategory,
          checked: false,
        }],
      },
    }));
    setNewItem('');
  };

  const removeItem = (itemId: string) => {
    updateProject(projectId!, p => ({
      ...p,
      phase_3_packing: {
        ...p.phase_3_packing,
        items: p.phase_3_packing.items.filter(i => i.id !== itemId),
      },
    }));
  };

  const categories = [...new Set(items.map(i => i.category))].sort();

  if (events.length === 0) {
    return (
      <div className="p-6 md:p-10 max-w-3xl mx-auto text-center py-20">
        <Backpack className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-40" />
        <h2 className="font-heading text-xl font-semibold mb-2">Build your itinerary first</h2>
        <p className="text-muted-foreground mb-4">Packing lists are generated based on your itinerary activities.</p>
        <Button onClick={() => navigate(`/project/${projectId}/itinerary`)}>Go to Itinerary</Button>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-10 max-w-3xl mx-auto fade-in">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="font-heading text-2xl font-bold">Packing List</h2>
          <p className="text-sm text-muted-foreground">
            {items.filter(i => i.checked).length}/{items.length} packed
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={generateList} className="gap-1">
            <RefreshCw className="h-3 w-3" /> {items.length ? 'Regenerate' : 'Generate'}
          </Button>
          <TeenShareDialog items={items} projectName={project.metadata.name} />
        </div>
      </div>

      {items.length === 0 ? (
        <Card className="text-center py-12">
          <CardContent>
            <p className="text-muted-foreground mb-4">Click "Generate" to create your packing list based on your itinerary.</p>
            <Button onClick={generateList}>Generate Packing List</Button>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="flex gap-2 mb-6">
            <Input
              value={newItem}
              onChange={e => setNewItem(e.target.value)}
              placeholder="Add custom item..."
              onKeyDown={e => e.key === 'Enter' && addItem()}
              className="flex-1"
            />
            <Input
              value={newCategory}
              onChange={e => setNewCategory(e.target.value)}
              placeholder="Category"
              className="w-32"
            />
            <Button size="sm" onClick={addItem}>Add</Button>
          </div>

          <div className="space-y-6">
            {categories.map(cat => (
              <Card key={cat}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">{cat}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-1">
                  {items.filter(i => i.category === cat).map(item => (
                    <div key={item.id} className="flex items-center justify-between group py-1">
                      <label className="flex items-center gap-2 cursor-pointer flex-1">
                        <input
                          type="checkbox"
                          checked={item.checked}
                          onChange={() => toggleItem(item.id)}
                          className="h-4 w-4 rounded accent-primary"
                        />
                        <span className={`text-sm ${item.checked ? 'line-through text-muted-foreground' : ''}`}>
                          {item.name}
                          {item.autoAdded && <span className="ml-1 text-xs text-warning">⚡</span>}
                        </span>
                      </label>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 opacity-0 group-hover:opacity-100 text-destructive"
                        onClick={() => removeItem(item.id)}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function TeenShareDialog({ items, projectName }: { items: PackingItem[]; projectName: string }) {
  const categories = [...new Set(items.map(i => i.category))].sort();

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1">
          <Share2 className="h-3 w-3" /> Teen View
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md max-h-[80vh] overflow-auto">
        <DialogHeader>
          <DialogTitle className="font-heading">🎒 {projectName || 'Trip'} – What to Pack</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 mt-4">
          {categories.map(cat => (
            <div key={cat}>
              <h4 className="font-semibold text-sm mb-1">{cat}</h4>
              <ul className="space-y-1">
                {items.filter(i => i.category === cat).map(item => (
                  <li key={item.id} className="flex items-center gap-2 text-sm">
                    {item.checked ? (
                      <Check className="h-3 w-3 text-success" />
                    ) : (
                      <span className="w-3 h-3 rounded-sm border inline-block" />
                    )}
                    {item.name}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
