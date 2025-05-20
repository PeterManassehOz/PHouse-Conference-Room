import React from 'react';
import {
  useGetInvitesQuery,
  useRespondInviteMutation
} from '../../redux/meetingApi/meetingApi';
import { useGetUserProfileQuery } from '../../redux/profileAuthApi/profileAuthApi';
import { useSelector } from 'react-redux';
import Spinner from '../Spinner/Spinner';

const Invite = () => {
  const dark = useSelector(s => s.theme.darkMode);

  // 1. Load invites
  const {
    data: invites = [],
    isLoading: invitesLoading,
    isError
  } = useGetInvitesQuery();

  // 2. Load current user
  const {
    data: profile,
    isLoading: profileLoading
  } = useGetUserProfileQuery();

  // 3. Mutation to accept/decline
  const [respond, { isLoading: respLoading }] = useRespondInviteMutation();

  if (invitesLoading || profileLoading) return <Spinner />;
  if (isError)   return <p className="text-red-500 text-center mt-10">Failed to load invites.</p>;
  if (invites.length === 0) return <p className="text-gray-500 text-center mt-10">No pending invites.</p>;

  const myId = profile?._id;

  return (
    <div className="flex flex-wrap gap-5 p-4 mt-10">
      {invites.map(meeting => {
        const me = meeting.participants.find(p => p.user === myId);
        const currentStatus = me?.status ?? 'Pending';

        return (
          <div
            key={meeting._id}
            className={`
              flex-shrink-0
              w-full sm:w-[48%] lg:w-[31%]
              p-4 border rounded-lg shadow
              ${dark 
                ? 'bg-gray-800 text-white border-gray-700' 
                : 'bg-white text-black border-gray-200'}
            `}
          >
            <h3 className="text-lg font-semibold mb-1">
              {meeting.title}
            </h3>
            <time className="block text-sm text-gray-500 mb-2">
              {new Date(meeting.date).toLocaleString()}
            </time>
            {meeting.description && (
              <p className="text-sm mb-2 italic text-gray-400">
                {meeting.description}
              </p>
            )}

            {meeting.createdBy?.email && (
              <p className="text-sm italic mb-2 text-gray-400">
                <span className="text-sm italic mb-2 text-blue-600">Invited by: </span>{meeting.createdBy.email}
              </p>
            )}

            <div className="mt-2">
              <select
                value={currentStatus}
                disabled={respLoading}
                onChange={e =>
                  respond({
                    meetingId: meeting._id,
                    status: e.target.value
                  })
                }
                className={`
                  w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-400
                  ${dark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-gray-100 border-gray-300 text-black'}
                `}
              >
                  <option value="Pending">Pending</option>
                  <option value="Accepted">Accept</option>
                  <option value="Declined">Decline</option>
              </select>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default Invite;