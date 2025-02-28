// app/components/StatCard.jsx
export default function StatCard({ title, value, icon }) {
  return (
    <div className="bg-white p-4 rounded-lg shadow">
      <div className="flex items-center">
        {icon && <div className="mr-4 text-blue-500">{icon}</div>}
        <div>
          <h3 className="text-gray-500">{title}</h3>
          <p className="text-2xl font-bold">{value}</p>
        </div>
      </div>
    </div>
  );
}
