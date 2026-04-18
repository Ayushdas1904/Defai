import React from "react";
import { Copy, Check } from "lucide-react";

interface Contact {
  name: string;
  address: string;
}

interface ContactUIProps {
  data: Contact[];
}

const ContactUI: React.FC<ContactUIProps> = ({ data }) => {
  const [copiedIndex, setCopiedIndex] = React.useState<number | null>(null);

  const handleCopy = (address: string, index: number) => {
    navigator.clipboard.writeText(address);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  return (
    <div className="mt-5 pl-10">
      <div className="grid grid-cols-2 text-sm font-semibold text-gray-400 mb-2">
        <div>Name</div>
        <div className="text-right">Address</div>
      </div>
      <div className="space-y-2">
        {data.map((contact, i) => (
          <div
            key={i}
            className="grid grid-cols-2 bg-gray-800/40 p-2 rounded-lg text-gray-200 items-center"
          >
            <div className="font-medium capitalize">{contact.name}</div>
            <div className="flex items-center justify-end gap-2">
              <span className="text-xs text-gray-400 truncate">
                {contact.address}
              </span>
              <button
                onClick={() => handleCopy(contact.address, i)}
                className="text-gray-500 hover:text-gray-300 transition p-1"
                title="Copy address"
              >
                {copiedIndex === i ? (
                  <Check size={16} className="text-green-400" />
                ) : (
                  <Copy size={16} />
                )}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ContactUI;
