import BookingCalendar from "@/components/booking/BookingCalendar";

export const metadata = { title: "Book a Meeting with the CEO — Open Limits Design" };

export default function BookMeetingPage() {
  return (
    <main className="page">
      <section className="section">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Private Consultation</p>
            <h1>Book a meeting with our CEO.</h1>
            <p>
              Select an available date and time. Blocked and already-booked slots are disabled.
              Your request stays pending until our team confirms it.
            </p>
          </div>
        </div>
        <BookingCalendar />
      </section>
    </main>
  );
}
