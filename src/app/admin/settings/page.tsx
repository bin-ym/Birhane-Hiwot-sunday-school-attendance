"use client";
export default function AdminSettings() {
  return (
    <div className="space-y-8">
      <h1 className="heading-responsive text-blue-900">Admin Settings</h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card-responsive">
          <h2 className="text-lg sm:text-xl font-semibold text-blue-800 mb-4">
            Change Password
          </h2>
          <form className="flex flex-col gap-4">
            <input
              type="password"
              placeholder="Current Password"
              className="p-2 sm:p-3 border rounded-lg text-responsive focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <input
              type="password"
              placeholder="New Password"
              className="p-2 sm:p-3 border rounded-lg text-responsive focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <input
              type="password"
              placeholder="Confirm New Password"
              className="p-2 sm:p-3 border rounded-lg text-responsive focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <button className="btn-responsive bg-blue-600 text-white hover:bg-blue-700">
              Change Password
            </button>
          </form>
        </div>

        <div className="card-responsive">
          <h2 className="text-lg sm:text-xl font-semibold text-blue-800 mb-4">
            Profile
          </h2>
          <form className="flex flex-col gap-4">
            <input
              type="text"
              placeholder="Name"
              className="p-2 sm:p-3 border rounded-lg text-responsive focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <input
              type="email"
              placeholder="Email"
              className="p-2 sm:p-3 border rounded-lg text-responsive focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <button className="btn-responsive bg-blue-600 text-white hover:bg-blue-700">
              Update Profile
            </button>
          </form>
        </div>

        <div className="card-responsive lg:col-span-2">
          <h2 className="text-lg sm:text-xl font-semibold text-blue-800 mb-4">
            System Settings
          </h2>
          <div className="text-gray-500 text-responsive">
            [System settings options will go here]
          </div>
        </div>
      </div>
    </div>
  );
}
