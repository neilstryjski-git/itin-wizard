import { Lightbulb, Cloud, Thermometer, Globe, Smartphone, CreditCard } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

const roadmapItems = [
  {
    title: 'Google Drive Sync',
    description: 'Automatically back up trip data to Google Drive for cross-device access.',
    status: 'planned',
    icon: Cloud,
  },
  {
    title: 'Real-time Weather',
    description: 'Show live weather forecasts for your destination integrated into the itinerary.',
    status: 'planned',
    icon: Thermometer,
  },
  {
    title: 'Multi-language Support',
    description: 'Translate packing lists and itineraries for international travel groups.',
    status: 'exploring',
    icon: Globe,
  },
  {
    title: 'Mobile App',
    description: 'Native mobile app with offline access to itineraries and documents.',
    status: 'exploring',
    icon: Smartphone,
  },
  {
    title: 'Budget Tracker',
    description: 'Track expenses per trip with currency conversion and spending categories.',
    status: 'planned',
    icon: CreditCard,
  },
];

const statusColors: Record<string, string> = {
  planned: 'bg-primary/10 text-primary',
  exploring: 'bg-warning/10 text-warning',
  'in-progress': 'bg-success/10 text-success',
};

export default function Roadmap() {
  return (
    <div className="p-6 md:p-10 max-w-3xl mx-auto fade-in">
      <div className="mb-8">
        <h1 className="text-3xl font-heading font-bold">Roadmap</h1>
        <p className="text-muted-foreground mt-1">Future enhancements we're considering</p>
      </div>

      <div className="space-y-4">
        {roadmapItems.map((item, i) => (
          <Card key={item.title} className="slide-up" style={{ animationDelay: `${i * 60}ms` }}>
            <CardContent className="p-5 flex gap-4">
              <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center shrink-0">
                <item.icon className="h-5 w-5 text-secondary-foreground" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-semibold">{item.title}</h3>
                  <Badge variant="secondary" className={statusColors[item.status]}>
                    {item.status}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">{item.description}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="mt-8 border-dashed border-2">
        <CardContent className="p-5 flex items-center gap-3 text-muted-foreground">
          <Lightbulb className="h-5 w-5" />
          <p className="text-sm">Have a feature idea? We'd love to hear it!</p>
        </CardContent>
      </Card>
    </div>
  );
}
