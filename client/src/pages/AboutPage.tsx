import { Link } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, Calendar, Users, Trash2 } from 'lucide-react';

export function AboutPage() {
  return (
    <div className="h-full overflow-auto bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-8"
        >
          <ArrowLeft size={20} />
          Back to Matrix
        </Link>

        <h1 className="text-4xl font-bold text-gray-900 mb-6">
          The Eisenhower Matrix
        </h1>

        <p className="text-lg text-gray-600 mb-8">
          The Eisenhower Matrix, also known as the Urgent-Important Matrix, is a
          powerful time management tool that helps you prioritize tasks by
          urgency and importance. Named after Dwight D. Eisenhower, the 34th
          President of the United States, who was known for his exceptional
          ability to manage his time effectively.
        </p>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">
            How It Works
          </h2>
          <p className="text-gray-600 mb-4">
            The matrix divides your tasks into four quadrants based on two
            criteria:
          </p>
          <ul className="list-disc list-inside text-gray-600 space-y-2 mb-4">
            <li>
              <strong>Urgency:</strong> How soon does the task need to be
              completed?
            </li>
            <li>
              <strong>Importance:</strong> How much does the task contribute to
              your long-term goals?
            </li>
          </ul>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {/* Quadrant 1: Do */}
          <div className="bg-red-50 rounded-xl border border-red-200 p-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-red-200 rounded-lg flex items-center justify-center">
                <CheckCircle2 className="text-red-700" size={24} />
              </div>
              <div>
                <h3 className="font-bold text-red-900">Do</h3>
                <p className="text-sm text-red-700">Urgent & Important</p>
              </div>
            </div>
            <p className="text-red-800 text-sm">
              Tasks with deadlines or consequences. These require immediate
              attention and should be done first. Examples: crisis management,
              deadline-driven projects, emergency issues.
            </p>
          </div>

          {/* Quadrant 2: Schedule */}
          <div className="bg-amber-50 rounded-xl border border-amber-200 p-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-amber-200 rounded-lg flex items-center justify-center">
                <Calendar className="text-amber-700" size={24} />
              </div>
              <div>
                <h3 className="font-bold text-amber-900">Schedule</h3>
                <p className="text-sm text-amber-700">Not Urgent & Important</p>
              </div>
            </div>
            <p className="text-amber-800 text-sm">
              Tasks with unclear deadlines that contribute to long-term success.
              Schedule time to work on these. Examples: strategic planning,
              personal development, relationship building.
            </p>
          </div>

          {/* Quadrant 3: Delegate */}
          <div className="bg-cyan-50 rounded-xl border border-cyan-200 p-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-cyan-200 rounded-lg flex items-center justify-center">
                <Users className="text-cyan-700" size={24} />
              </div>
              <div>
                <h3 className="font-bold text-cyan-900">Delegate</h3>
                <p className="text-sm text-cyan-700">Urgent & Not Important</p>
              </div>
            </div>
            <p className="text-cyan-800 text-sm">
              Tasks that must get done but don't require your specific skill
              set. Delegate these to others when possible. Examples: certain
              emails, some meetings, routine tasks.
            </p>
          </div>

          {/* Quadrant 4: Delete */}
          <div className="bg-gray-100 rounded-xl border border-gray-300 p-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-gray-300 rounded-lg flex items-center justify-center">
                <Trash2 className="text-gray-700" size={24} />
              </div>
              <div>
                <h3 className="font-bold text-gray-900">Delete</h3>
                <p className="text-sm text-gray-600">
                  Not Urgent & Not Important
                </p>
              </div>
            </div>
            <p className="text-gray-700 text-sm">
              Distractions and unnecessary tasks. Eliminate these to free up
              time for what matters. Examples: time wasters, excessive social
              media, busy work.
            </p>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">
            Tips for Success
          </h2>
          <ul className="space-y-3 text-gray-600">
            <li className="flex items-start gap-3">
              <span className="font-bold text-indigo-600 mt-0.5">1.</span>
              <span>
                <strong>Review daily:</strong> Start each day by categorizing
                your tasks into the four quadrants.
              </span>
            </li>
            <li className="flex items-start gap-3">
              <span className="font-bold text-indigo-600 mt-0.5">2.</span>
              <span>
                <strong>Focus on Quadrant 2:</strong> Important but not urgent
                tasks often get neglected. Scheduling time for these prevents
                them from becoming crises.
              </span>
            </li>
            <li className="flex items-start gap-3">
              <span className="font-bold text-indigo-600 mt-0.5">3.</span>
              <span>
                <strong>Be honest:</strong> It's easy to convince yourself
                everything is urgent. Take time to truly assess each task.
              </span>
            </li>
            <li className="flex items-start gap-3">
              <span className="font-bold text-indigo-600 mt-0.5">4.</span>
              <span>
                <strong>Learn to say no:</strong> Protecting your time from
                Quadrant 3 and 4 tasks is essential for productivity.
              </span>
            </li>
          </ul>
        </div>

        <div className="bg-indigo-50 rounded-xl border border-indigo-200 p-6">
          <h2 className="text-xl font-semibold text-indigo-900 mb-3">
            Famous Quote
          </h2>
          <blockquote className="text-indigo-800 italic">
            "What is important is seldom urgent and what is urgent is seldom
            important."
          </blockquote>
          <p className="text-indigo-600 mt-2 text-sm">
            — Dwight D. Eisenhower
          </p>
        </div>

        <div className="mt-8 pb-8 text-center">
          <Link
            to="/"
            className="inline-flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 transition-colors"
          >
            Start Prioritizing
          </Link>
        </div>
      </div>
    </div>
  );
}
