// Load models in correct order to prevent MissingSchemaError
import "@/lib/models/User";
import "@/lib/models/Course";
import "@/lib/models/UserProgress";
import "@/lib/models/Activity";
import "@/lib/models/Notification";

import "@/lib/models/Message";
import "@/lib/models/Post";

import "@/lib/models/UserInteractions";

export {};
