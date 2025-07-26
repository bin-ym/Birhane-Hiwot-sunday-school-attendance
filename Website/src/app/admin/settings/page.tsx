"use client";
export default function AdminSettings() {
  return (
    <div className="min-h-screen flex flex-col gap-8">
      <h1 className="text-3xl font-extrabold text-blue-900 mb-4">Admin Settings</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="bg-white shadow rounded-xl p-6">
          <h2 className="text-xl font-semibold text-blue-800 mb-4">Change Password</h2>
          <form className="flex flex-col gap-4">
            <input type="password" placeholder="Current Password" className="p-3 border rounded-lg" />
            <input type="password" placeholder="New Password" className="p-3 border rounded-lg" />
            <input type="password" placeholder="Confirm New Password" className="p-3 border rounded-lg" />
            <button className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">Change Password</button>
          </form>
        </div>
        <div className="bg-white shadow rounded-xl p-6">
          <h2 className="text-xl font-semibold text-blue-800 mb-4">Profile</h2>
          <form className="flex flex-col gap-4">
            <input type="text" placeholder="Name" className="p-3 border rounded-lg" />
            <input type="email" placeholder="Email" className="p-3 border rounded-lg" />
            <button className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">Update Profile</button>
          </form>
        </div>
        <div className="bg-white shadow rounded-xl p-6 col-span-1 md:col-span-2">
          <h2 className="text-xl font-semibold text-blue-800 mb-4">System Settings</h2>
          <div className="text-gray-500">[System settings options will go here]</div>
        </div>
      </div>
    </div>
  );
} 