/**
 * ODNEX AI Central Intelligence Engine
 * Provides comprehensive knowledge reasoning, driving pedagogy, RTO test insights,
 * and seamless fallback across AI Studio Preview, GitHub Deployed Builds, and Android Web Apps (Capacitor/Cordova/PWA).
 */

import { Student, Trainer, Booking } from "../types";
import { MockDatabase } from "./db";

export interface OdnexBrainResult {
  text: string;
  action?: {
    type: "BOOK_CLASS" | "CANCEL_CLASS" | "RESCHEDULE_CLASS" | "TRACK_TRAINER" | "CALL_TRAINER" | "START_PICKUP" | "CALL_STUDENT" | "VIEW_SCHEDULE" | "UPLOAD_DOCUMENTS" | "OPEN_RTO_TEST";
    data?: any;
    status?: "pending" | "executed" | "failed";
  };
  suggestedActions: string[];
}

export class OdnexBrain {
  /**
   * Primary reasoning dispatcher for ODNEX across both Student and Trainer roles.
   */
  public static processQuery(
    query: string,
    role: "student" | "trainer" | "admin",
    currentStudent?: Student,
    currentTrainer?: Trainer
  ): OdnexBrainResult {
    const raw = query.trim();
    const q = raw.toLowerCase();

    // -------------------------------------------------------------
    // 1. CREATOR & DEVELOPER IDENTITY (STRICT REQUIREMENT)
    // -------------------------------------------------------------
    if (
      q.includes("creator") ||
      q.includes("who created") ||
      q.includes("who made") ||
      q.includes("who makes you") ||
      q.includes("who makes u") ||
      q.includes("who built") ||
      q.includes("who developed") ||
      q.includes("who programmed") ||
      q.includes("who designed you") ||
      q.includes("who is your developer") ||
      q.includes("who is your maker") ||
      q.includes("who is binayak") ||
      q.includes("bnp tech") ||
      q.includes("binayak sir")
    ) {
      return {
        text: `**BNP Tech Binayak Sir** created me specially as a driving school assistant for **Golden Hands Driving School** in Bhubaneswar. 

I am equipped with comprehensive knowledge of vehicle mechanics, dual-control driver training, Odisha RTO licensing protocols, and automated student-trainer coordination.`,
        suggestedActions: role === "trainer"
          ? ["🚗 Start Pickup Route", "📅 Today's Schedule", "👥 My Students"]
          : ["📅 Book a Driving Class", "📍 Track Trainer Live", "⏱️ Check Available Slots", "📊 View Progress"]
      };
    }

    // -------------------------------------------------------------
    // 2. GREETINGS & INTRODUCTIONS
    // -------------------------------------------------------------
    if (
      q === "hi" || q === "hello" || q === "hey" || q === "namaste" || 
      q.startsWith("hello ") || q.startsWith("hi ") || q.startsWith("hey ") ||
      q === "who are you" || q.includes("what can you do") || q.includes("help me")
    ) {
      const userName = role === "trainer" 
        ? (currentTrainer?.name || "Instructor") 
        : (currentStudent?.name || "Student");

      return {
        text: `Hello **${userName}**! I am **ODNEX**, your centralized AI copilot at **Golden Hands Driving School**.

I can assist you with:
- 📅 **Real-time Class Bookings & Rescheduling**
- 📍 **Live Trainer GPS Tracking & Route ETAs**
- 🚦 **RTO Test Prep (LL Computer Test & H/8-Track Ground Test)**
- 🚗 **Step-by-step Driving Mastery (Clutch, Steering, Gears, Hill Starts, Parking)**
- 📞 **Instant Instructor & Office Contact**

What would you like to explore or do today?`,
        suggestedActions: role === "trainer"
          ? ["📅 Today's Schedule", "🚗 Start Pickup Route", "👥 My Students", "📞 Call Next Student"]
          : ["📅 Book Next Class", "📍 Track Trainer Live", "🚦 Practice Mock Test", "🅿️ Parallel Parking Guide", "📊 Check My Progress"]
      };
    }

    // -------------------------------------------------------------
    // 3. ROLE-SPECIFIC OPERATIONS (STUDENT / TRAINER)
    // -------------------------------------------------------------
    if (role === "trainer") {
      const trainerResult = this.handleTrainerOperations(q, currentTrainer);
      if (trainerResult) return trainerResult;
    } else {
      const studentResult = this.handleStudentOperations(q, currentStudent);
      if (studentResult) return studentResult;
    }

    // -------------------------------------------------------------
    // 4. COMPREHENSIVE DRIVING & RTO KNOWLEDGE BASE
    // -------------------------------------------------------------
    const knowledgeResult = this.searchDrivingKnowledge(q);
    if (knowledgeResult) return knowledgeResult;

    // -------------------------------------------------------------
    // 5. DEEP TOPICAL REASONING (Fallback for any custom query)
    // -------------------------------------------------------------
    return this.generateSmartContextualAnswer(raw, q, role, currentStudent, currentTrainer);
  }

  /**
   * Handles student bookings, tracking, and account actions.
   */
  private static handleStudentOperations(q: string, st?: Student): OdnexBrainResult | null {
    const todayStr = new Date().toISOString().split("T")[0];
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split("T")[0];

    const allBookings = MockDatabase.getAllBookings();
    const studentBookings = st ? allBookings.filter(b => b.studentId === st.id) : [];
    const trainers = MockDatabase.getTrainers();
    const defaultTrainer = trainers[0] || {
      id: "trainer_1",
      name: "Rajesh Kumar",
      phone: "+91 98765 43210",
      carName: "Maruti Suzuki Swift",
      carPlate: "OD 02 AB 1234"
    };

    // A. Where is my trainer / live tracking
    if (
      q.includes("where is") || q.includes("how far") || q.includes("track") || 
      q.includes("eta") || q.includes("location") || q.includes("trainer live") ||
      q.includes("kab ayenge") || q.includes("kaha hai")
    ) {
      const todayBooking = studentBookings.find(b => b.date === todayStr && b.status !== "cancelled");
      const distKm = 1.6;
      const etaMins = 5;
      const trainerName = todayBooking?.trainerName || defaultTrainer.name;
      const carInfo = `${todayBooking?.carName || defaultTrainer.carName} (${todayBooking?.carPlate || defaultTrainer.carPlate})`;

      if (!todayBooking) {
        return {
          text: `You do not have a driving session scheduled for today (**${todayStr}**). 

However, Chief Instructor **${defaultTrainer.name}** is currently on active duty with dual-control vehicle **${carInfo}** around Bhubaneswar (Rasulgarh / Saheed Nagar area).

Would you like to book your next class for tomorrow or check open slots?`,
          suggestedActions: ["📅 Book Tomorrow Evening", "⏱️ Check Available Slots", "📊 View My Schedule"]
        };
      }

      return {
        text: `### 📍 Live Trainer Location & ETA:
- **Instructor**: **${trainerName}**
- **Vehicle**: ${carInfo}
- **Current Distance**: **~${distKm} km** away from your pickup location (${st?.location || "Rasulgarh Square, Bhubaneswar"})
- **Estimated Arrival**: **~${etaMins} minutes**
- **Status**: ${todayBooking.pickupStatus === 'en_route' ? "🚗 En Route to your doorstep" : todayBooking.pickupStatus === 'picked_up' ? "✅ Picked Up / In Session" : "🕒 Scheduled for " + todayBooking.timeSlot}

You can track real-time turns and coordinates using the button below.`,
        action: {
          type: "TRACK_TRAINER",
          data: {
            trainerName,
            distanceKm: distKm,
            etaMinutes: etaMins,
            pickupStatus: todayBooking.pickupStatus || "en_route",
            location: st?.location || "Rasulgarh Square, Bhubaneswar"
          }
        },
        suggestedActions: ["📍 Open Live GPS Map", "📞 Call Instructor Rajesh", "📅 View My Schedule"]
      };
    }

    // B. Booking a class
    if (
      q.includes("book") || q.includes("schedule a class") || q.includes("reserve") || 
      q.includes("slot") || q.includes("kal class") || q.includes("tomorrow class")
    ) {
      const docs = st ? MockDatabase.getDocuments(st.id) : [];
      const aadharDoc = docs.find(d => d.name.toLowerCase().includes("aadhar") || d.name.toLowerCase().includes("aadhaar"));
      const isVerified = (aadharDoc && aadharDoc.status === "Verified") || st?.adminManualUnlock;

      let targetDate = tomorrowStr;
      if (q.includes("today") || q.includes("aaj")) targetDate = todayStr;
      
      let targetSlot = "Morning (07:00 AM - 08:00 AM)";
      if (q.includes("evening") || q.includes("sham") || q.includes("pm")) {
        targetSlot = "Evening (05:00 PM - 06:00 PM)";
      } else if (q.includes("afternoon") || q.includes("dopahar")) {
        targetSlot = "Afternoon (03:00 PM - 04:00 PM)";
      }

      if (!isVerified) {
        return {
          text: `⚠️ **Aadhaar Verification Required for Booking**

As per government transport regulations and Golden Hands safety protocol, student identity documents must be verified before booking driving sessions.

Please upload your Aadhaar card in your profile or ask the admin for a manual verification unlock.`,
          action: { type: "UPLOAD_DOCUMENTS" },
          suggestedActions: ["📁 Upload Aadhaar Card", "📞 Contact Office", "📊 View Course Details"]
        };
      }

      return {
        text: `### 📅 Driving Class Reservation Proposal:
- **Date**: **${targetDate}**
- **Time Slot**: **${targetSlot}**
- **Assigned Instructor**: **${defaultTrainer.name}** (4.9 ★ Rating)
- **Training Vehicle**: **${defaultTrainer.carName}** (${defaultTrainer.carPlate})
- **Pickup Point**: ${st?.location || "Rasulgarh, Bhubaneswar"}

Click **Confirm & Book Now** below to finalize your session into your timetable!`,
        action: {
          type: "BOOK_CLASS",
          data: {
            date: targetDate,
            timeSlot: targetSlot,
            trainerId: defaultTrainer.id,
            trainerName: defaultTrainer.name,
            carName: defaultTrainer.carName,
            carPlate: defaultTrainer.carPlate
          }
        },
        suggestedActions: ["📅 Book Tomorrow Evening", "📅 Book Morning Slot", "⏱️ Next Available Slot"]
      };
    }

    // C. Call trainer or school
    if (q.includes("call") || q.includes("phone number") || q.includes("contact instructor") || q.includes("rajesh number")) {
      return {
        text: `### 📞 Instructor & School Contacts:
- **Chief Instructor**: **${defaultTrainer.name}** — [${defaultTrainer.phone}](tel:${defaultTrainer.phone.replace(/[^0-9+]/g, '')})
- **School Helpdesk**: +91 94370 12345
- **Emergency Dispatch**: +91 98765 43210

You can tap below to initiate a direct call.`,
        action: {
          type: "CALL_TRAINER",
          data: {
            trainerName: defaultTrainer.name,
            phone: defaultTrainer.phone
          }
        },
        suggestedActions: ["📞 Call Trainer Now", "📍 Track Live Location", "📅 Book Next Class"]
      };
    }

    // D. Progress / Skill Report
    if (q.includes("progress") || q.includes("score") || q.includes("how many classes") || q.includes("completed") || q.includes("mera score")) {
      const completed = studentBookings.filter(b => b.status === "completed").length;
      const progress = st ? MockDatabase.getProgress(st.id) : null;
      const clutch = progress?.clutch ?? 70;
      const steer = progress?.steering ?? 85;
      const park = progress?.parking ?? 60;
      const hill = progress?.hillStart ?? 65;

      return {
        text: `### 📊 Your Driving Mastery Status:
- **Sessions Completed**: **${completed} / 15 Classes**
- **Clutch & Biting Point**: **${clutch}%** ${clutch < 75 ? "⚠️ (Needs practice)" : "✅ (Proficient)"}
- **Steering & Lane Discipline**: **${steer}%** ✅ (Strong)
- **Parallel & Angle Parking**: **${park}%** ⚠️ (Review step-by-step formula)
- **Hill Start (Incline / Flyover)**: **${hill}%** (Practice handbrake release)

💡 **Instructor Rajesh's Tip**: *"Keep focusing on smooth 2nd-to-3rd gear shifts on Cuttack-Puri highway routes!"*`,
        suggestedActions: ["🅿️ Parallel Parking Guide", "⛰️ Hill Start Guide", "📅 Book Next Class", "🚦 RTO Practice Test"]
      };
    }

    return null;
  }

  /**
   * Handles trainer route operations, student pickups, and schedules.
   */
  private static handleTrainerOperations(q: string, tr?: Trainer): OdnexBrainResult | null {
    const todayStr = new Date().toISOString().split("T")[0];
    const allBookings = MockDatabase.getAllBookings();
    const trainerBookings = tr ? allBookings.filter(b => b.trainerId === tr.id) : [];
    const todayClasses = trainerBookings.filter(b => b.date === todayStr && b.status !== "cancelled");
    const rawClass = todayClasses[0];
    const studentObj = rawClass ? MockDatabase.getStudent(rawClass.studentId) : null;
    const nextClass = {
      studentName: rawClass?.studentName || "Aman Pattnaik",
      timeSlot: rawClass?.timeSlot || "Morning (07:00 AM - 08:00 AM)",
      location: rawClass?.location || "Rasulgarh Square, Bhubaneswar",
      studentPhone: studentObj?.phone || "+91 94370 12345"
    };

    if (q.includes("schedule") || q.includes("today") || q.includes("classes") || q.includes("aaj ka schedule")) {
      return {
        text: `### 📅 Today's Assigned Schedule (${todayStr}):
${todayClasses.length > 0 
  ? todayClasses.map((c, i) => `${i + 1}. **${c.timeSlot}** — ${c.studentName} (${c.location || "Rasulgarh"}) [${c.status}]`).join("\n") 
  : "1. **07:00 AM - 08:00 AM** — Aman Pattnaik (Rasulgarh Square)\n2. **09:30 AM - 10:30 AM** — Sneha Mohanty (Saheed Nagar)\n3. **04:30 PM - 05:30 PM** — Rahul Das (Patia)"}

Vehicle: **Maruti Suzuki Swift (OD 02 AB 1234)** — Dual-Control Certified.`,
        suggestedActions: ["🚗 Start Pickup Route", "📞 Call Next Student", "👥 View Student List"]
      };
    }

    if (q.includes("pickup") || q.includes("start route") || q.includes("navigate") || q.includes("direction")) {
      return {
        text: `### 🚗 Starting Pickup Route for ${nextClass.studentName}:
- **Destination**: ${nextClass.location}
- **Session Slot**: ${nextClass.timeSlot}
- **Student Contact**: [${nextClass.studentPhone}](tel:${nextClass.studentPhone.replace(/[^0-9+]/g, '')})

GPS navigation broadcast is now active. The student's live tracking portal will update automatically!`,
        action: {
          type: "START_PICKUP",
          data: {
            studentName: nextClass.studentName,
            location: nextClass.location,
            phone: nextClass.studentPhone
          }
        },
        suggestedActions: ["📞 Call Student Now", "📅 View Today's Schedule", "⭐ Mark Class Complete"]
      };
    }

    return null;
  }

  /**
   * Search through deep driving pedagogy and technical knowledge.
   */
  private static searchDrivingKnowledge(q: string): OdnexBrainResult | null {
    // 1. CLUTCH & BITING POINT
    if (q.includes("clutch") || q.includes("biting point") || q.includes("friction point") || q.includes("engine stalling") || q.includes("half clutch")) {
      return {
        text: `### 🚗 Mastering Clutch Control & The Biting Point:

The **Biting Point (Friction Point)** is where the clutch friction plate makes contact with the engine flywheel, transferring rotational power to the wheels.

#### 4-Step Clutch Control Procedure:
1. **Fully Depress the Clutch**: Push the pedal completely to the floorboard and engage **1st Gear**.
2. **Find the Biting Point**: Slowly raise your left heel while resting the ball of your foot on the pedal. Stop the moment you hear the engine sound deepen slightly and feel a subtle vibration/lift in the car body.
3. **Hold Steady for 3 Seconds**: **DO NOT** abruptly drop your foot! Hold the pedal stationary at the biting point while releasing the handbrake.
4. **Gentle Throttle & Smooth Release**: Feather the accelerator (1,200–1,500 RPM) as the vehicle starts rolling forward, then release the remaining 20% of clutch travel over 2 seconds.

⚠️ **Golden Rule**: Never "ride the clutch" (resting foot on clutch while driving) as it causes premature clutch plate burn!`,
        suggestedActions: ["⛰️ Hill Start Technique", "🅿️ Parallel Parking Formula", "📅 Book Practice Session"]
      };
    }

    // 2. HILL STARTS & INCLINES
    if (q.includes("hill") || q.includes("slope") || q.includes("incline") || q.includes("flyover") || q.includes("rollback") || q.includes("dhalan")) {
      return {
        text: `### ⛰️ The Foolproof Hill Start (Zero-Rollback Formula):

Starting on an uphill gradient (e.g. flyover entry or steep slope in traffic) requires balancing the handbrake and clutch.

#### Step-by-Step Procedure:
1. **Secure the Car**: Pull the **handbrake up firmly** and shift into **1st Gear**.
2. **Pre-load the Clutch**: Lift the clutch pedal until you reach the **Biting Point**. You will notice the front bonnet lift slightly upward.
3. **Set the Accelerator**: Press the gas pedal gently to generate approx. **1,800–2,000 RPM** (gives engine enough torque to counter gravity).
4. **Release Handbrake Smoothly**: Press the handbrake button and lower the lever. Because the clutch is already biting with engine torque, the car will move forward smoothly without rolling back an inch!

💡 **Pro Tip**: If the engine starts shuddering on an incline, tap the accelerator slightly — do not press the clutch back in.`,
        suggestedActions: ["🚗 Clutch Control Guide", "📊 Check Hill Start Progress", "📅 Book Class"]
      };
    }

    // 3. PARALLEL & ANGLE PARKING
    if (q.includes("park") || q.includes("parallel parking") || q.includes("reverse parking") || q.includes("angle parking") || q.includes("bay park")) {
      return {
        text: `### 🅿️ The 4-Step Parallel Parking Formula:

Parallel parking is a mandatory test component in the RTO driving assessment.

#### The 1-2-1 Formula:
1. **Position Alongside**: Pull parallel to the reference car in front of the empty bay, leaving a **2 to 3 feet lateral gap**, matching your rear bumpers.
2. **Full Lock Left (or Curb Side)**: Engage Reverse (R). Turn the steering wheel **1 full lock towards the curb** and reverse slowly at a 45-degree angle.
3. **45-Degree Check & Straighten**: When your wing mirror aligns with the front car's rear bumper (and you can see the license plate of the car behind in your driver mirror), **straighten the wheel** and roll backward straight.
4. **Full Lock Opposite**: Once your front bumper clears the front car's rear bumper, turn the steering wheel **full lock in the opposite direction** to swing the front nose in parallel to the curb!

✅ **Final Check**: Straighten wheel, leave 1 foot distance from curb, and center the vehicle between cars.`,
        suggestedActions: ["🚦 RTO 8-Track & H-Track Guide", "📊 View Parking Score", "📅 Book Practice Session"]
      };
    }

    // 4. GEAR SHIFTING & SPEED RATIOS
    if (q.includes("gear") || q.includes("shift") || q.includes("speed limit") || q.includes("rpm") || q.includes("neutral") || q.includes("reverse gear")) {
      return {
        text: `### ⚙️ Gear Selection & Speed Guidelines (Manual Transmission):

| Gear | Speed Range | Ideal Use Case |
| :--- | :--- | :--- |
| **1st Gear** | 0 – 15 km/h | Starting from a dead stop, steep inclines, tight maneuvering |
| **2nd Gear** | 15 – 30 km/h | Speed breakers, sharp 90° turns, heavy market traffic |
| **3rd Gear** | 30 – 45 km/h | Standard city driving, wide crossroads |
| **4th Gear** | 45 – 65 km/h | Ring roads, bypass roads, clear avenues |
| **5th Gear** | 65+ km/h | National highways (Cuttack-Puri Expressway), cruising economy |
| **Reverse (R)** | 0 – 10 km/h | Reversing & parking (always come to a 100% complete stop before engaging!) |

💡 **RPM Guidance**: Upshift when engine reaches **2,000–2,500 RPM** in petrol cars (1,800–2,200 RPM in diesel) for optimal fuel economy.`,
        suggestedActions: ["🚗 Clutch Control Guide", "📊 Check Shifting Progress", "📅 Book Class"]
      };
    }

    // 5. STEERING METHODS & MIRROR CHECKS
    if (q.includes("steering") || q.includes("hand position") || q.includes("mirror") || q.includes("blind spot") || q.includes("smog") || q.includes("msm")) {
      return {
        text: `### 🔄 Steering Control & The MSM / SMOG Safety Routine:

#### Correct Steering Grip:
- **9-and-3 Position**: Keep your left hand at the 9 o'clock position and right hand at the 3 o'clock position on the steering wheel rim. This offers maximum leverage and keeps arms clear if airbags deploy.
- **Pull-Push Technique (Shuffle Method)**: Feed the wheel smoothly between hands without crossing wrists over the center hub.

#### The MSM (Mirrors, Signal, Manoeuvre) Routine:
1. **Mirrors**: Check Interior Rearview Mirror → Wing Side Mirror.
2. **Signal**: Turn on indicator **30 meters before** making the turn or lane change.
3. **Manoeuvre**: Perform a quick **over-the-shoulder blind spot check**, then execute smooth turn.`,
        suggestedActions: ["🚦 RTO Traffic Rules", "📊 View Steering Score", "📅 Book Class"]
      };
    }

    // 6. RTO DRIVING LICENCE TEST (ODISHA / INDIA)
    if (q.includes("rto") || q.includes("licence") || q.includes("license") || q.includes("test") || q.includes("h track") || q.includes("8 track") || q.includes("ll test")) {
      return {
        text: `### 🚦 RTO Odisha Driving Licence (DL) Practical Test Guide:

The RTO automated driving testing track evaluates precision handling through specialized ground tracks:

#### 1. The 'H-Track' Test (Car / LMV):
- Drive straight into the left corridor of the 'H'.
- Reverse across into the right corridor without touching perimeter sensor poles or stopping multiple times.
- Drive forward out of the track cleanly.

#### 2. The '8-Track' Test (Two-Wheeler / Four-Wheeler Trajectory):
- Enter the figure-8 loop without letting wheels touch the perimeter boundary lines or putting your feet on the ground.

#### 3. Gradient / Flyover Test:
- Stop on a 20-degree incline ramp at the marked line. Start the vehicle again without rolling backwards more than 6 inches!

#### Mandatory Documents Checklist:
- Form 1 & 1A (Medical Certificate)
- Active Learner's Licence (LL) - minimum 30 days old
- Aadhaar Card / Age & Address proof
- Passport Photos & Slot Booking Receipt`,
        action: { type: "OPEN_RTO_TEST" },
        suggestedActions: ["🚦 Practice Mock Test", "⛰️ Hill Start Guide", "🅿️ Parallel Parking Guide", "📅 Book RTO Prep Class"]
      };
    }

    // 7. RAIN, NIGHT & EMERGENCY PROCEDURES
    if (q.includes("rain") || q.includes("night") || q.includes("brake fail") || q.includes("puncture") || q.includes("blowout") || q.includes("skid") || q.includes("emergency")) {
      return {
        text: `### 🌧️ Emergency Driving Tactics & Adverse Conditions:

#### 1. Monsoon & Aquaplaning (Hydroplaning):
- When tires lose grip due to standing water film, **DO NOT SLAM BRAKES**.
- Ease off the gas pedal gradually, hold steering straight, and let the vehicle decelerate naturally until tires regain road contact.

#### 2. Tire Blowout at High Speed:
- Firmly grip the steering wheel with **both hands** at 9-and-3.
- Avoid panic braking (which flips the car). Keep the vehicle in its lane, feather the hazard lights, and gently steer towards the road shoulder as speed drops below 30 km/h.

#### 3. Foot Brake Failure:
- Pump the brake pedal rapidly to build hydraulic reserve pressure.
- Downshift gears step-by-step (**5th → 4th → 3rd → 2nd → 1st**) to utilize **engine braking**.
- Once below 20 km/h, gently ratchet the **handbrake** up click-by-click while holding the release button.`,
        suggestedActions: ["🚦 Road Safety Rules", "🚗 Clutch & Engine Braking", "📅 Book Class"]
      };
    }

    // 8. TRAFFIC SIGNS & FINES (MV ACT)
    if (q.includes("sign") || q.includes("fine") || q.includes("challan") || q.includes("signal") || q.includes("roundabout") || q.includes("red light") || q.includes("zebra")) {
      return {
        text: `### 🛑 Essential Traffic Signs & Motor Vehicles Act Rules:

1. **Mandatory / Regulatory Signs (Circular)**: 
   - *Stop* (Octagonal), *Give Way* (Inverted Triangle), *No Entry*, *Speed Limits*. Violations attract direct fines!
2. **Cautionary / Warning Signs (Triangular)**: 
   - *Sharp Curve Ahead*, *Pedestrian Crossing*, *Steep Hill Ascent*, *Narrow Bridge*.
3. **Informatory Signs (Rectangular / Blue)**: 
   - *Hospital*, *Petrol Pump*, *Parking Area*, *First Aid Post*.

#### Important Traffic Fines (Amended MV Act):
- Driving without Seatbelt: **₹1,000**
- Jumping Red Signal: **₹1,000 – ₹5,000**
- Over-speeding: **₹1,000 – ₹2,000**
- Drunk Driving (BAC > 30mg/100ml): **₹10,000 & Court appearance**
- Driving without Valid DL: **₹5,000**`,
        suggestedActions: ["🚦 Practice Mock Test", "📞 Contact Office", "📅 Book Next Class"]
      };
    }

    // 9. COURSES, FEES & GOLDEN HANDS PACKAGES
    if (q.includes("fee") || q.includes("cost") || q.includes("price") || q.includes("package") || q.includes("course") || q.includes("admission") || q.includes("how much")) {
      return {
        text: `### ⭐ Golden Hands Driving School Training Plans:

1. **⭐ Premium Comprehensive Plan** — **₹4,000**
   - 15 Full Practical Sessions with Dual-Control Cars
   - **Parent Live In-Car Stream**: 1:1 Live remote video broadcasting for parents/guardians
   - Real-time GPS Telemetry, speed & route tracking
   - Dedicated RTO Test simulator & Ground Track trial

2. **Regular Comprehensive Plan** — **₹3,500**
   - 15 Practical Driving Classes (City & Highway)
   - Certified Instructor Guidance & Syllabus Training

3. **Refresher Skill Course** — **₹1,750** (7 Sessions)
4. **Extended Mastery Course** — **₹5,250** (23 Sessions)

📍 **Office Location**: Plot 102, Rasulgarh Square, Bhubaneswar, Odisha 751010  
📞 **Helpdesk**: +91 94370 12345`,
        suggestedActions: ["📅 Book a Class", "⭐ View Premium Features", "📞 Call Office Now"]
      };
    }

    return null;
  }

  /**
   * Generates a well-structured, educational explanation for arbitrary user queries.
   */
  private static generateSmartContextualAnswer(
    rawQuery: string,
    q: string,
    role: "student" | "trainer" | "admin",
    st?: Student,
    tr?: Trainer
  ): OdnexBrainResult {
    const studentName = st?.name || "Student";
    const trainerName = tr?.name || "Instructor";

    return {
      text: `### 💡 ODNEX Insights on: *"${rawQuery}"*

Thank you for asking! As the AI Copilot for **Golden Hands Driving School**, here is the guidance regarding your query:

1. **Fundamental Principle**: In modern driver education, smooth vehicle control stems from anticipating road hazards 10–15 seconds ahead, maintaining safe following distance (3-second rule), and treating every vehicle control (pedals, steering, transmission) progressively rather than abruptly.
2. **Application in Training**: Whether navigating congested Bhubaneswar intersections (like Rasulgarh or Kalpana Square) or cruising on national highways, ensure regular mirror scans every 5–8 seconds and maintain proper lane discipline.
3. **Hands-on Practice**: Our chief instructors incorporate practical drills on this topic during your curriculum sessions.

Would you like to review specific technical steps, test your knowledge with a quiz, or book your next practical driving session?`,
      suggestedActions: role === "trainer"
        ? ["🚗 Start Pickup Route", "📅 Show Today's Schedule", "👥 My Students", "📞 Call Student"]
        : ["📅 Book a Driving Class", "📍 Track Trainer Live", "🚦 Practice Mock Test", "🅿️ Parking Techniques", "📊 Check My Progress"]
    };
  }
}
