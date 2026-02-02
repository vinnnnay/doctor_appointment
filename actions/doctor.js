"use server";

import { db } from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";

/* ------------------ HELPER ------------------ */
async function getCurrentDoctor(clerkUserId) {
  const doctor = await db.user.findFirst({
    where: {
      clerkUserId,
      role: "DOCTOR",
    },
  });

  if (!doctor) throw new Error("Doctor not found");
  return doctor;
}

/* ------------------ SET AVAILABILITY ------------------ */
export async function setAvailabilitySlots(formData) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  try {
    const doctor = await getCurrentDoctor(userId);

    const startTime = formData.get("startTime");
    const endTime = formData.get("endTime");

    if (!startTime || !endTime)
      throw new Error("Start time and end time are required");

    if (startTime >= endTime)
      throw new Error("Start time must be before end time");

    const existingSlots = await db.availability.findMany({
      where: { doctorId: doctor.id },
      include: { appointment: true }, // FIXED
    });

    const slotsWithNoAppointments = existingSlots.filter(
      (slot) => !slot.appointment
    );

    if (slotsWithNoAppointments.length > 0) {
      await db.availability.deleteMany({
        where: {
          id: { in: slotsWithNoAppointments.map((s) => s.id) },
        },
      });
    }

    const newSlot = await db.availability.create({
      data: {
        doctorId: doctor.id,
        startTime: new Date(startTime),
        endTime: new Date(endTime),
        status: "AVAILABLE",
      },
    });

    revalidatePath("/doctor");
    return { success: true, slot: newSlot };
  } catch (error) {
    throw new Error("Failed to set availability: " + error.message);
  }
}

/* ------------------ GET AVAILABILITY ------------------ */
export async function getDoctorAvailability() {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  try {
    const doctor = await getCurrentDoctor(userId);

    const slots = await db.availability.findMany({
      where: { doctorId: doctor.id },
      orderBy: { startTime: "asc" },
    });

    return { slots };
  } catch (error) {
    throw new Error("Failed to fetch availability slots " + error.message);
  }
}

/* ------------------ GET APPOINTMENTS ------------------ */
export async function getDoctorAppointments() {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  try {
    const doctor = await getCurrentDoctor(userId);

    const appointments = await db.appointment.findMany({
      where: {
        doctorId: doctor.id,
        status: "SCHEDULED",
      },
      include: { patient: true },
      orderBy: { startTime: "asc" },
    });

    return { appointments };
  } catch (error) {
    throw new Error("Failed to fetch appointments " + error.message);
  }
}

/* ------------------ CANCEL APPOINTMENT ------------------ */
export async function cancelAppointment(formData) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  try {
    const user = await db.user.findUnique({
      where: { clerkUserId: userId },
    });

    const appointmentId = formData.get("appointmentId");

    const appointment = await db.appointment.findUnique({
      where: { id: appointmentId },
      include: { patient: true, doctor: true },
    });

    if (!appointment)
      throw new Error("Appointment not found");

    if (appointment.doctorId !== user.id && appointment.patientId !== user.id)
      throw new Error("Not authorized");

    await db.$transaction(async (tx) => {
      await tx.appointment.update({
        where: { id: appointmentId },
        data: { status: "CANCELLED" },
      });

      await tx.creditTransaction.createMany({
        data: [
          { userId: appointment.patientId, amount: 2, type: "APPOINTMENT_DEDUCTION" },
          { userId: appointment.doctorId, amount: -2, type: "APPOINTMENT_DEDUCTION" },
        ],
      });

      await tx.user.update({
        where: { id: appointment.patientId },
        data: { credits: { increment: 2 } },
      });

      await tx.user.update({
        where: { id: appointment.doctorId },
        data: { credits: { decrement: 2 } },
      });
    });

    revalidatePath(user.role === "DOCTOR" ? "/doctor" : "/appointments");
    return { success: true };
  } catch (error) {
    throw new Error("Failed to cancel appointment: " + error.message);
  }
}

/* ------------------ ADD NOTES ------------------ */
export async function addAppointmentNotes(formData) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  try {
    const doctor = await getCurrentDoctor(userId);

    const appointmentId = formData.get("appointmentId");
    const notes = formData.get("notes");

    const appointment = await db.appointment.findFirst({
      where: { id: appointmentId, doctorId: doctor.id },
    });

    if (!appointment) throw new Error("Appointment not found");

    const updated = await db.appointment.update({
      where: { id: appointmentId },
      data: { notes },
    });

    revalidatePath("/doctor");
    return { success: true, appointment: updated };
  } catch (error) {
    throw new Error("Failed to update notes: " + error.message);
  }
}

/* ------------------ MARK COMPLETED ------------------ */
export async function markAppointmentCompleted(formData) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  try {
    const doctor = await getCurrentDoctor(userId);

    const appointmentId = formData.get("appointmentId");

    const appointment = await db.appointment.findFirst({
      where: { id: appointmentId, doctorId: doctor.id },
      include: { patient: true },
    });

    if (!appointment) throw new Error("Not authorized");

    if (appointment.status !== "SCHEDULED")
      throw new Error("Only scheduled appointments can be completed");

    if (new Date() < new Date(appointment.endTime))
      throw new Error("Cannot complete before end time");

    const updated = await db.appointment.update({
      where: { id: appointmentId },
      data: { status: "COMPLETED" },
    });

    revalidatePath("/doctor");
    return { success: true, appointment: updated };
  } catch (error) {
    throw new Error("Failed to mark appointment completed: " + error.message);
  }
}
