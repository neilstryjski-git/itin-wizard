# Project Charter: Trip Wizard

## 🎯 Mission (Elevator Pitch)
Trip Wizard is an AI-first travel companion that transforms the chaos of fragmented booking confirmations into a structured, shareable, and offline-ready itinerary. By simply "dropping" PDFs, screenshots, or raw text into the app, users get a professionally formatted travel plan without the manual data entry typically required by traditional travel apps.

## 👥 Target Audience
*   **The Multi-Channel Traveler**: People who book flights, hotels, and activities across different platforms (Expedia, Airbnb, direct airlines) and struggle to keep them in one place.
*   **Small Group Coordinators**: Families or friends planning trips together who need a "single source of truth" that everyone can edit.
*   **International Explorers**: Travelers who frequently visit areas with unreliable data connectivity and require guaranteed offline access to their documents and plans.

## 🏗️ Problem Space
Traditional travel planning is plagued by three major frictions:
1.  **Manual Toil**: Users have to copy-paste confirmation codes, times, and addresses into calendars or notes manually.
2.  **Fragmented Context**: Trip-wide resources (entry requirements, insurance docs, shared GDrive links) are often separated from the chronological timeline.
3.  **Connectivity Anxiety**: Important travel details are often trapped behind logins or in "the cloud," making them inaccessible exactly when they are needed most (e.g., at a border crossing or remote hotel check-in).

## 🚀 Differentiators
*   **Zero-Effort Extraction**: Unlike most apps that require manual input, Trip Wizard uses multimodal AI to "read" your documents and build the timeline for you.
*   **True Offline PWA**: Built as a Progressive Web App, it behaves like a native mobile app that functions perfectly in Airplane Mode, without requiring an App Store download.
*   **Trip-Wide Intelligence**: It doesn't just track events; it analyzes the whole trip to extract high-level summaries and resources, providing a holistic view at the top of the itinerary.
*   **Privacy-First Sharing**: Collaborative editing via simple email invitation, bypassing the need for complex social network integrations.

## 🛑 Out of Scope
*   **Booking Engine**: Trip Wizard does not handle the actual booking or payment of travel; it is a management and organization tool for existing bookings.
*   **Real-Time Flight Tracking**: We do not currently provide live gate-change notifications or flight delay alerts (though links to airline trackers are included).
*   **Social Networking**: This is a utility for private groups, not a public platform for sharing itineraries with the general public.
*   **Expense Tracking**: While notes can store costs, a dedicated multi-currency expense management system is not part of the core mission.
