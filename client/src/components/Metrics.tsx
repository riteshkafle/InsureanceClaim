import { TrendingDown, TrendingUp, DollarSign, Shield, Globe, Users, AlertTriangle } from "lucide-react";

const Metrics = () => {
  return (
    <section id="metrics" className="py-20 bg-white">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16 space-y-4">
          <h2 className="text-4xl md:text-5xl font-bold text-foreground">
            The Medical Debt Crisis
          </h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            Medical debt affects millions of Americans. TrueClaim.AI helps you fight back.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6 max-w-6xl mx-auto mb-16">
          <div className="p-8 rounded-2xl bg-gradient-to-br from-primary/10 to-primary/5 border-2 border-primary/20">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-16 h-16 bg-primary rounded-xl flex items-center justify-center">
                <Users className="w-8 h-8 text-primary-foreground" />
              </div>
              <div>
                <div className="text-4xl font-bold text-foreground">41%</div>
                <div className="text-sm text-muted-foreground">of Americans</div>
              </div>
            </div>
            <p className="text-foreground leading-relaxed font-medium">
              Carry medical debt — over <span className="text-primary font-bold">$220 billion</span> in total across the U.S.
            </p>
            <p className="text-muted-foreground mt-3 text-sm">
              That means <span className="font-semibold text-foreground">one in five people</span> you know is silently fighting bills they don't even understand.
            </p>
          </div>

          <div className="p-8 rounded-2xl bg-gradient-to-br from-destructive/10 to-destructive/5 border-2 border-destructive/20">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-16 h-16 bg-destructive rounded-xl flex items-center justify-center">
                <AlertTriangle className="w-8 h-8 text-destructive-foreground" />
              </div>
              <div>
                <div className="text-4xl font-bold text-foreground">41%</div>
                <div className="text-sm text-muted-foreground">denial rate</div>
              </div>
            </div>
            <p className="text-foreground leading-relaxed font-medium">
              <span className="text-destructive font-bold">41% denial rate</span> every year for insurance claims.
            </p>
            <p className="text-muted-foreground mt-3 text-sm">
              <span className="font-semibold text-foreground">1.5% increase</span> in denials from 2023 to 2024, making it harder for patients to get coverage.
            </p>
          </div>

          <div className="p-8 rounded-2xl bg-gradient-to-br from-success/10 to-success/5 border-2 border-success/20">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-16 h-16 bg-success rounded-xl flex items-center justify-center">
                <TrendingDown className="w-8 h-8 text-success-foreground" />
              </div>
              <div>
                <div className="text-4xl font-bold text-foreground">15%</div>
                <div className="text-sm text-muted-foreground">billing errors</div>
              </div>
            </div>
            <p className="text-foreground leading-relaxed font-medium">
              In early testing, users identified up to <span className="text-success font-bold">15% in billing errors</span>, recovering hundreds of dollars in charges they never should've owed.
            </p>
          </div>
        </div>

        <div className="bg-gradient-to-br from-info/10 to-info/5 border-2 border-info/20 rounded-2xl p-8 max-w-4xl mx-auto">
          <div className="grid md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="w-14 h-14 bg-info rounded-xl flex items-center justify-center mx-auto mb-3">
                <Shield className="w-7 h-7 text-info-foreground" />
              </div>
              <h3 className="font-bold text-foreground mb-2">Responsible AI</h3>
              <p className="text-sm text-muted-foreground">
                Built with locally hosted models, encrypted uploads, and transparent reasoning for every output.
              </p>
            </div>
            <div className="text-center">
              <div className="w-14 h-14 bg-info rounded-xl flex items-center justify-center mx-auto mb-3">
                <DollarSign className="w-7 h-7 text-info-foreground" />
              </div>
              <h3 className="font-bold text-foreground mb-2">Your Privacy First</h3>
              <p className="text-sm text-muted-foreground">
                No data is sold. No personal health information leaves our secure cloud.
              </p>
            </div>
            <div className="text-center">
              <div className="w-14 h-14 bg-info rounded-xl flex items-center justify-center mx-auto mb-3">
                <Globe className="w-7 h-7 text-info-foreground" />
              </div>
              <h3 className="font-bold text-foreground mb-2">Accessible to All</h3>
              <p className="text-sm text-muted-foreground">
                Multilingual, accessibility-first design ensures everyone — from seniors to non-native speakers — can use it.
              </p>
            </div>
          </div>
        </div>

        <div className="mt-12 text-center">
          <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
            And it doesn't stop with healthcare. TrueClaim.AI is expanding to help with other financial assistance programs and services.
          </p>
        </div>
      </div>
    </section>
  );
};

export default Metrics;

