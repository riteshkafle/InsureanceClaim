import { Star } from "lucide-react";

const testimonials = [
  {
    name: "Sarah Johnson",
    role: "Patient",
    content: "TrueClaim.AI saved me hours of work! The AI automatically filled out my claim form from my medical bill. I also got help with my income waiver and tax forms. Amazing!",
    rating: 5,
    image: "/placeholder.svg",
  },
  {
    name: "Michael Chen",
    role: "Family Caregiver",
    content: "The auto-fill feature is incredible. I uploaded my bill and everything was extracted and filled automatically. Plus, the tax form generation made filing so much easier.",
    rating: 5,
    image: "/placeholder.svg",
  },
  {
    name: "Emily Rodriguez",
    role: "Healthcare Advocate",
    content: "Best platform I've used. The income waiver assistance was a lifesaver, and having all documents ready in one place - claim forms, waivers, and tax docs - is fantastic.",
    rating: 5,
    image: "/placeholder.svg",
  },
];

const Testimonials = () => {
  return (
    <section id="testimonials" className="py-20 bg-background">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16 space-y-4">
          <h2 className="text-4xl md:text-5xl font-bold text-foreground">
            What Our Users Say
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Join thousands of satisfied customers who have successfully filed their claims with TrueClaim.AI.
          </p>
        </div>
        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {testimonials.map((testimonial, index) => (
            <div 
              key={index}
              className="p-6 rounded-2xl border border-border bg-card hover:shadow-lg transition-all"
            >
              <div className="flex gap-1 mb-4">
                {[...Array(testimonial.rating)].map((_, i) => (
                  <Star key={i} className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                ))}
              </div>
              <p className="text-muted-foreground mb-6 leading-relaxed">
                "{testimonial.content}"
              </p>
              <div className="flex items-center gap-4">
                <img 
                  src={testimonial.image} 
                  alt={testimonial.name}
                  className="w-12 h-12 rounded-full object-cover"
                />
                <div>
                  <div className="font-semibold text-foreground">{testimonial.name}</div>
                  <div className="text-sm text-muted-foreground">{testimonial.role}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Testimonials;
